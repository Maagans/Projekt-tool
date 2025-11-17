import { randomUUID } from "crypto";
import { withTransaction } from "../../utils/transactions.js";
import { createAppError } from "../../utils/errors.js";
import { ensureEmployeeLinkForUser, syncProjectReports } from "../workspaceService.js";
import { toDateOnly } from "../../utils/helpers.js";

const allowedProjectStatus = new Set(["active", "completed", "on-hold"]);

const toDateOnlyString = (value) => toDateOnly(value);

const sanitizeProjectPayload = (payload = {}, fallback = {}) => {
  const config = payload.config ?? {};
  const fallbackConfig = fallback.config ?? {};
  const fallbackStatus = fallback.status;
  const fallbackDescription = fallback.description;
  const defaultDate = () => toDateOnlyString(new Date());
  const resolveDate = (value, fallbackValue) => toDateOnlyString(value) ?? fallbackValue ?? defaultDate();

  return {
    id: payload.id && typeof payload.id === "string" ? payload.id : randomUUID(),
    config: {
      projectName: (config.projectName ?? fallbackConfig.projectName ?? "").trim() || "Nyt projekt",
      projectStartDate: resolveDate(config.projectStartDate, fallbackConfig.projectStartDate),
      projectEndDate: resolveDate(
        config.projectEndDate,
        fallbackConfig.projectEndDate ?? config.projectStartDate ?? fallbackConfig.projectStartDate
      ),
    },
    status: allowedProjectStatus.has(payload.status)
      ? payload.status
      : fallbackStatus && allowedProjectStatus.has(fallbackStatus)
        ? fallbackStatus
        : "active",
    description:
      typeof payload.description === "string"
        ? payload.description
        : typeof fallbackDescription === "string"
          ? fallbackDescription
          : "",
  };
};

const assertCanManageProjects = async (client, user) => {
  const effectiveUser = await ensureEmployeeLinkForUser(client, user);
  if (!effectiveUser) {
    throw createAppError("Unauthorized", 401);
  }
  const role = effectiveUser.role;
  if (role !== "Administrator" && role !== "Projektleder") {
    throw createAppError("Forbidden: Insufficient permissions.", 403);
  }
  return effectiveUser;
};

const checkProjectLead = async (client, projectId, employeeId) => {
  const result = await client.query(
    `
      SELECT 1 FROM project_members
      WHERE project_id = $1::uuid AND employee_id = $2::uuid AND is_project_lead = true
      LIMIT 1
    `,
    [projectId, employeeId],
  );
  return result.rowCount > 0;
};

export const createProjectRecord = async (payload, user) =>
  withTransaction(async (client) => {
    const effectiveUser = await assertCanManageProjects(client, user);
    const data = sanitizeProjectPayload(payload);

    const existing = await client.query(`SELECT 1 FROM projects WHERE id = $1::uuid`, [data.id]);
    if (existing.rowCount > 0) {
      throw createAppError("Project already exists.", 409);
    }

    const insertResult = await client.query(
      `
        INSERT INTO projects (id, name, start_date, end_date, status, description)
        VALUES ($1::uuid, $2, $3::date, $4::date, $5, $6)
        RETURNING id::text
      `,
      [
        data.id,
        data.config.projectName,
        data.config.projectStartDate,
        data.config.projectEndDate,
        data.status,
        data.description,
      ],
    );

    const projectId = insertResult.rows[0].id;
    if (effectiveUser.role === "Projektleder" && effectiveUser.employeeId) {
      await client.query(
        `
          INSERT INTO project_members (id, project_id, employee_id, role, member_group, is_project_lead)
          VALUES ($1::uuid, $2::uuid, $3::uuid, 'Projektleder', 'projektgruppe', true)
          ON CONFLICT DO NOTHING
        `,
        [randomUUID(), projectId, effectiveUser.employeeId],
      );
    }

    if (Array.isArray(payload.reports) && payload.reports.length > 0) {
      await syncProjectReports(client, projectId, payload.reports);
    }

    return projectId;
  });

export const updateProjectRecord = async (projectId, projectPayload, user) =>
  withTransaction(async (client) => {
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    if (!effectiveUser) {
      throw createAppError("Unauthorized", 401);
    }
    if (effectiveUser.role === "Projektleder") {
      if (!effectiveUser.employeeId || !(await checkProjectLead(client, projectId, effectiveUser.employeeId))) {
        throw createAppError("Forbidden: Insufficient permissions.", 403);
      }
    } else if (effectiveUser.role !== "Administrator") {
      throw createAppError("Forbidden: Insufficient permissions.", 403);
    }

    const currentResult = await client.query(
      `
        SELECT name, start_date, end_date, status, description
        FROM projects
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [projectId],
    );
    if (currentResult.rowCount === 0) {
      throw createAppError("Project not found.", 404);
    }
    const currentRow = currentResult.rows[0];

    const sanitized = sanitizeProjectPayload(
      { ...projectPayload, id: projectId },
      {
        config: {
          projectName: currentRow.name,
          projectStartDate: toDateOnlyString(currentRow.start_date),
          projectEndDate: toDateOnlyString(currentRow.end_date),
        },
        status: currentRow.status,
        description: currentRow.description ?? "",
      },
    );
    const result = await client.query(
      `
        UPDATE projects
        SET name = $1, start_date = $2::date, end_date = $3::date, status = $4, description = $5
        WHERE id = $6::uuid
        RETURNING id::text
      `,
      [
        sanitized.config.projectName,
        sanitized.config.projectStartDate,
        sanitized.config.projectEndDate,
        sanitized.status,
        sanitized.description,
        projectId,
      ],
    );

    if (result.rowCount === 0) {
      throw createAppError("Project not found.", 404);
    }

    if (Array.isArray(projectPayload.reports) && projectPayload.reports.length > 0) {
      await syncProjectReports(client, projectId, projectPayload.reports);
    }

    return projectId;
  });

export const deleteProjectRecord = async (projectId, user) =>
  withTransaction(async (client) => {
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    if (!effectiveUser) {
      throw createAppError("Unauthorized", 401);
    }
    if (effectiveUser.role === "Projektleder") {
      if (!effectiveUser.employeeId || !(await checkProjectLead(client, projectId, effectiveUser.employeeId))) {
        throw createAppError("Forbidden: Insufficient permissions.", 403);
      }
    } else if (effectiveUser.role !== "Administrator") {
      throw createAppError("Forbidden: Insufficient permissions.", 403);
    }

    const result = await client.query(`DELETE FROM projects WHERE id = $1::uuid`, [projectId]);
    if (result.rowCount === 0) {
      throw createAppError("Project not found.", 404);
    }
    return { success: true };
  });
