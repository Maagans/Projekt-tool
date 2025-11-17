import { randomUUID } from "crypto";
import { withTransaction } from "../../utils/transactions.js";
import { createAppError } from "../../utils/errors.js";
import { ensureEmployeeLinkForUser } from "../workspaceService.js";

const mapMemberRow = (row) => ({
  id: row.id,
  projectId: row.project_id,
  employeeId: row.employee_id,
  role: row.role,
  group: row.member_group,
  isProjectLead: row.is_project_lead,
  timeEntries: [],
});

const assertCanManageProject = async (client, projectId, user) => {
  const effectiveUser = await ensureEmployeeLinkForUser(client, user);
  if (!effectiveUser) {
    throw createAppError("Unauthorized", 401);
  }
  if (effectiveUser.role === "Administrator") {
    return effectiveUser;
  }
  if (effectiveUser.role !== "Projektleder" || !effectiveUser.employeeId) {
    throw createAppError("Forbidden: Insufficient permissions.", 403);
  }
  const result = await client.query(
    `
      SELECT 1
      FROM project_members
      WHERE project_id = $1::uuid AND employee_id = $2::uuid AND is_project_lead = true
      LIMIT 1
    `,
    [projectId, effectiveUser.employeeId],
  );
  if (result.rowCount === 0) {
    throw createAppError("Forbidden: Insufficient permissions.", 403);
  }
  return effectiveUser;
};

const ensureEmployeeExists = async (client, employeeId) => {
  const result = await client.query(`SELECT id::text FROM employees WHERE id = $1::uuid`, [employeeId]);
  if (result.rowCount === 0) {
    throw createAppError("Employee not found.", 404);
  }
};

export const addProjectMemberRecord = async (projectId, payload, user) =>
  withTransaction(async (client) => {
    await assertCanManageProject(client, projectId, user);
    await ensureEmployeeExists(client, payload.employeeId);

    const existingMember = await client.query(
      `
        SELECT id::text
        FROM project_members
        WHERE project_id = $1::uuid AND employee_id = $2::uuid
        LIMIT 1
      `,
      [projectId, payload.employeeId],
    );
    if (existingMember.rowCount > 0) {
      throw createAppError("Employee is already assigned to this project.", 409);
    }

    const memberId = payload.id ?? randomUUID();
    await client.query(
      `
        INSERT INTO project_members (id, project_id, employee_id, role, member_group, is_project_lead)
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
      `,
      [
        memberId,
        projectId,
        payload.employeeId,
        payload.role?.trim() || "Ny rolle",
        payload.group ?? "unassigned",
        Boolean(payload.isProjectLead),
      ],
    );

    const detailResult = await client.query(
      `
        SELECT id::text, project_id::text, employee_id::text, role, member_group, is_project_lead
        FROM project_members
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [memberId],
    );

    return mapMemberRow(detailResult.rows[0]);
  });

export const updateProjectMemberRecord = async (projectId, memberId, updates, user) =>
  withTransaction(async (client) => {
    await assertCanManageProject(client, projectId, user);
    const result = await client.query(
      `
        UPDATE project_members
        SET role = COALESCE($1, role),
            member_group = COALESCE($2, member_group),
            is_project_lead = COALESCE($3, is_project_lead)
        WHERE id = $4::uuid AND project_id = $5::uuid
        RETURNING id::text
      `,
      [updates.role?.trim(), updates.group, updates.isProjectLead, memberId, projectId],
    );
    if (result.rowCount === 0) {
      throw createAppError("Project member not found.", 404);
    }

    const detailResult = await client.query(
      `
        SELECT id::text, project_id::text, employee_id::text, role, member_group, is_project_lead
        FROM project_members
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [memberId],
    );
    return mapMemberRow(detailResult.rows[0]);
  });

export const deleteProjectMemberRecord = async (projectId, memberId, user) =>
  withTransaction(async (client) => {
    await assertCanManageProject(client, projectId, user);
    const result = await client.query(
      `DELETE FROM project_members WHERE id = $1::uuid AND project_id = $2::uuid`,
      [memberId, projectId],
    );
    if (result.rowCount === 0) {
      throw createAppError("Project member not found.", 404);
    }
    return { success: true };
  });
