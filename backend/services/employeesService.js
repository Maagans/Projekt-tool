import { randomUUID } from "crypto";
import { createAppError } from "../utils/errors.js";
import { withTransaction } from "../utils/transactions.js";
import { normalizeEmail, toNonNegativeCapacity } from "../utils/helpers.js";
import { ensureEmployeeLinkForUser, resolveDepartmentLocation } from "./workspaceService.js";

const EMPLOYEE_SELECT_FIELDS = `
  id::text,
  name,
  email,
  COALESCE(location, '') AS location,
  COALESCE(department, '') AS department,
  COALESCE(max_capacity_hours_week, 0)::float AS max_capacity_hours_week,
  azure_ad_id,
  job_title,
  account_enabled,
  synced_at
`;

const mapEmployeeRow = (row) => {
  const resolved = resolveDepartmentLocation(
    {
      location: row.location,
      department: row.department,
    },
    row,
  );

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    location: resolved.location ?? "",
    department: resolved.department ?? null,
    maxCapacityHoursWeek: Number(row.max_capacity_hours_week ?? 0),
    azureAdId: row.azure_ad_id ?? null,
    jobTitle: row.job_title ?? null,
    accountEnabled: row.account_enabled ?? true,
    syncedAt: row.synced_at ? new Date(row.synced_at).toISOString() : null,
  };
};

const assertAuthenticated = (user) => {
  if (!user) {
    throw createAppError("Unauthorized", 401);
  }
};

const assertAdmin = (user) => {
  assertAuthenticated(user);
  if (user.role !== "Administrator") {
    throw createAppError("Forbidden: Administrator access required.", 403);
  }
};

const fetchEmployeeOrThrow = async (client, employeeId) => {
  const result = await client.query(
    `
      SELECT ${EMPLOYEE_SELECT_FIELDS}
      FROM employees
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [employeeId],
  );
  if (result.rowCount === 0) {
    throw createAppError("Employee not found.", 404);
  }
  return result.rows[0];
};

const assertProjectLeadAccess = async (client, user, employeeId) => {
  if (!user) {
    throw createAppError("Unauthorized", 401);
  }
  if (user.role === "Administrator") {
    return true;
  }
  if (user.role !== "Projektleder") {
    throw createAppError("Forbidden: Insufficient permissions.", 403);
  }
  if (!user.employeeId) {
    throw createAppError("Forbidden: Missing employee linkage.", 403);
  }

  const result = await client.query(
    `
      SELECT 1
      FROM project_members target
      INNER JOIN project_members lead
        ON lead.project_id = target.project_id
      WHERE target.employee_id = $1::uuid
        AND lead.employee_id = $2::uuid
        AND lead.is_project_lead = true
      LIMIT 1
    `,
    [employeeId, user.employeeId],
  );

  if (result.rowCount === 0) {
    throw createAppError("Forbidden: Project lead access required.", 403);
  }
  return true;
};

const safeTrim = (value) => (typeof value === "string" ? value.trim() : "");

export const createEmployeeRecord = async (payload, user) =>
  withTransaction(async (client) => {
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    assertAdmin(effectiveUser);

    const employeeId = payload.id && typeof payload.id === "string" ? payload.id : randomUUID();
    const name = safeTrim(payload.name);
    const email = normalizeEmail(payload.email);
    if (!name) {
      throw createAppError("name is required.", 400);
    }
    if (!email) {
      throw createAppError("email is required.", 400);
    }

    const { location, department } = resolveDepartmentLocation({
      location: payload.location,
      department: payload.department,
    });
    const maxCapacity = toNonNegativeCapacity(payload.maxCapacityHoursWeek ?? 0);

    try {
      const insertResult = await client.query(
        `
          INSERT INTO employees (id, name, email, location, department, max_capacity_hours_week)
          VALUES ($1::uuid, $2, LOWER($3), NULLIF($4, ''), NULLIF($5, ''), $6::numeric)
          RETURNING ${EMPLOYEE_SELECT_FIELDS}
        `,
        [employeeId, name, email, location ?? "", department ?? "", maxCapacity],
      );

      return mapEmployeeRow(insertResult.rows[0]);
    } catch (error) {
      if (error.code === "23505") {
        throw createAppError("Employee with this email already exists.", 409, error);
      }
      throw error;
    }
  });

const applyLocationDepartmentUpdate = (updates, currentRow) => {
  if (!("location" in updates) && !("department" in updates)) {
    return null;
  }
  return resolveDepartmentLocation(
    {
      location: updates.location ?? currentRow.location,
      department: updates.department ?? currentRow.department,
    },
    currentRow,
  );
};

export const updateEmployeeRecord = async (employeeId, updates, user) =>
  withTransaction(async (client) => {
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertProjectLeadAccess(client, effectiveUser, employeeId);
    const existingRow = await fetchEmployeeOrThrow(client, employeeId);

    const setStatements = [];
    const params = [];
    let index = 1;

    if (updates.name !== undefined) {
      const trimmed = safeTrim(updates.name);
      if (!trimmed) {
        throw createAppError("name must not be empty.", 400);
      }
      setStatements.push(`name = $${index++}`);
      params.push(trimmed);
    }

    if (updates.email !== undefined) {
      const email = normalizeEmail(updates.email);
      if (!email) {
        throw createAppError("email must be valid.", 400);
      }
      setStatements.push(`email = LOWER($${index++})`);
      params.push(email);
    }

    const resolvedLocation = applyLocationDepartmentUpdate(updates, existingRow);
    if (resolvedLocation) {
      setStatements.push(`location = NULLIF($${index++}, '')`);
      params.push(resolvedLocation.location ?? "");
      setStatements.push(`department = NULLIF($${index++}, '')`);
      params.push(resolvedLocation.department ?? "");
    }

    if (updates.maxCapacityHoursWeek !== undefined) {
      const capacity = toNonNegativeCapacity(updates.maxCapacityHoursWeek);
      setStatements.push(`max_capacity_hours_week = $${index++}::numeric`);
      params.push(capacity);
    }

    if (setStatements.length === 0) {
      // Nothing to update.
      return mapEmployeeRow(existingRow);
    }

    try {
      const result = await client.query(
        `
          UPDATE employees
          SET ${setStatements.join(", ")}
          WHERE id = $${index}::uuid
          RETURNING ${EMPLOYEE_SELECT_FIELDS}
        `,
        [...params, employeeId],
      );
      return mapEmployeeRow(result.rows[0]);
    } catch (error) {
      if (error.code === "23505") {
        throw createAppError("Another employee already uses this email.", 409, error);
      }
      throw error;
    }
  });

export const deleteEmployeeRecord = async (employeeId, user) =>
  withTransaction(async (client) => {
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    assertAdmin(effectiveUser);
    await fetchEmployeeOrThrow(client, employeeId);

    await client.query(`DELETE FROM project_members WHERE employee_id = $1::uuid`, [employeeId]);
    await client.query(`DELETE FROM employees WHERE id = $1::uuid`, [employeeId]);

    return { success: true };
  });
