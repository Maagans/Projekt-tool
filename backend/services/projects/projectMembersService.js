import { randomUUID } from "crypto";
import { withTransaction } from "../../utils/transactions.js";
import { createAppError } from "../../utils/errors.js";
import { ensureEmployeeLinkForUser } from "../workspaceService.js";
import * as projectMembersRepository from "../../repositories/projectMembersRepository.js";

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
  const isLead = await projectMembersRepository.isLeadForProjectEmployee(client, projectId, effectiveUser.employeeId);
  if (!isLead) {
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

    const existingMember = await projectMembersRepository.existsForProjectEmployee(client, projectId, payload.employeeId);
    if (existingMember) {
      throw createAppError("Employee is already assigned to this project.", 409);
    }

    const memberId = payload.id ?? randomUUID();
    await projectMembersRepository.insertMember(client, {
      id: memberId,
      projectId,
      employeeId: payload.employeeId,
      role: payload.role?.trim() || "Ny rolle",
      group: payload.group ?? "unassigned",
      isProjectLead: Boolean(payload.isProjectLead),
    });

    const detailRow = await projectMembersRepository.findById(client, memberId);
    return mapMemberRow(detailRow);
  });

export const updateProjectMemberRecord = async (projectId, memberId, updates, user) =>
  withTransaction(async (client) => {
    await assertCanManageProject(client, projectId, user);
    const updated = await projectMembersRepository.updateMember(client, {
      projectId,
      memberId,
      role: updates.role?.trim(),
      group: updates.group,
      isProjectLead: updates.isProjectLead,
    });
    if (!updated) {
      throw createAppError("Project member not found.", 404);
    }

    const detailRow = await projectMembersRepository.findById(client, memberId);
    return mapMemberRow(detailRow);
  });

export const deleteProjectMemberRecord = async (projectId, memberId, user) =>
  withTransaction(async (client) => {
    await assertCanManageProject(client, projectId, user);
    const deleted = await projectMembersRepository.deleteMember(client, projectId, memberId);
    if (!deleted) {
      throw createAppError("Project member not found.", 404);
    }
    return { success: true };
  });
