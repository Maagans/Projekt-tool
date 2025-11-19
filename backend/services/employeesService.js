import { randomUUID } from "crypto";
import { createAppError } from "../utils/errors.js";
import { withTransaction } from "../utils/transactions.js";
import { normalizeEmail, toNonNegativeCapacity } from "../utils/helpers.js";
import { ensureEmployeeLinkForUser, resolveDepartmentLocation } from "./workspaceService.js";
import * as employeeRepository from "../repositories/employeeRepository.js";

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
  const employee = await employeeRepository.findById(client, employeeId);
  if (!employee) {
    throw createAppError("Employee not found.", 404);
  }
  return employee;
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

  const hasAccess = await employeeRepository.findProjectsWhereLead(client, user.employeeId, employeeId);
  if (!hasAccess) {
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
      const rawEmployee = await employeeRepository.create(client, {
        id: employeeId,
        name,
        email,
        location,
        department,
        maxCapacityHoursWeek: maxCapacity,
      });
      return mapEmployeeRow(rawEmployee);
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
      const updatedRow = await employeeRepository.update(client, employeeId, setStatements, params);
      return mapEmployeeRow(updatedRow);
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

    const deleted = await employeeRepository.deleteById(client, employeeId);
    if (!deleted) {
      throw createAppError("Employee not found.", 404);
    }

    return { success: true };
  });
