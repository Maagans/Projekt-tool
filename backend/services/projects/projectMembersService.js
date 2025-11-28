import { randomUUID } from "crypto";
import { withTransaction } from "../../utils/transactions.js";
import { createAppError } from "../../utils/errors.js";
import { ensureEmployeeLinkForUser } from "../workspaceService.js";
import * as projectMembersRepository from "../../repositories/projectMembersRepository.js";
import * as employeeRepository from "../../repositories/employeeRepository.js";

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

export const addProjectMemberRecord = async (projectId, payload, user) =>
  withTransaction(async (client) => {
    await assertCanManageProject(client, projectId, user);
    let createdEmployee = null;
    let employeeId = payload.employeeId;

    if (payload.newEmployee) {
      const normalizedEmail = payload.newEmployee.email.trim().toLowerCase();
      const existing = await employeeRepository.findByEmail(client, normalizedEmail);
      if (existing) {
        employeeId = existing.id;
      } else {
        createdEmployee = await employeeRepository.create(client, {
          id: payload.newEmployee.id ?? payload.employeeId, // allow client-supplied id for linkage
          name: payload.newEmployee.name.trim(),
          email: normalizedEmail,
          location: payload.newEmployee.location ?? "",
          department: payload.newEmployee.department ?? "Ekstern",
          maxCapacityHoursWeek: 0,
        });
        employeeId = createdEmployee?.id;
      }
    } else if (employeeId) {
      const existingEmployee = await employeeRepository.findById(client, employeeId);
      if (!existingEmployee) {
        throw createAppError("Employee not found.", 404);
      }
    }

    if (!employeeId) {
      throw createAppError("Employee not found.", 404);
    }

    const existingMember = await projectMembersRepository.existsForProjectEmployee(client, projectId, employeeId);
    if (existingMember) {
      throw createAppError("Employee is already assigned to this project.", 409);
    }

    const memberId = payload.id ?? randomUUID();
    await projectMembersRepository.insertMember(client, {
      id: memberId,
      projectId,
      employeeId,
      role: payload.role?.trim() || "Ny rolle",
      group: payload.group ?? "unassigned",
      isProjectLead: Boolean(payload.isProjectLead),
    });

    const detailRow = await projectMembersRepository.findById(client, memberId);
    return { member: mapMemberRow(detailRow), employee: createdEmployee };
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
    // Idempotent delete: if member is already gone, treat as success
    if (!deleted) {
      return { success: true };
    }
    return { success: true };
  });
