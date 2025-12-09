import pool from "../../db.js";
import { createAppError } from "../../utils/errors.js";
import { withTransaction } from "../../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "../workspaceService.js";
import { isAdmin, isProjectLeader } from "../../utils/permissions.js";
import { buildCategoryMeta, calculateRiskScore } from "./riskSchema.js";
import {
  archiveProjectRisk as archiveProjectRiskRepo,
  ensureProjectExists,
  fetchRiskById,
  insertProjectRisk,
  isProjectMember as isProjectMemberRepo,
  listProjectRisks as listProjectRisksRepo,
  updateProjectRisk as updateProjectRiskRepo,
} from "../../repositories/riskRepository.js";
import {
  parseRiskFilters,
  parseCreateRiskPayload,
  parseUpdateRiskPayload,
} from "../../validators/riskValidators.js";

const mapRiskRow = (row) => {
  const normalizeDate = (value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    try {
      return value.toISOString();
    } catch {
      return String(value);
    }
  };

  const owner = row.owner_id
    ? {
      id: row.owner_id,
      name: row.owner_name ?? null,
      email: row.owner_email ?? null,
    }
    : null;

  const normalizedDue = row.due_date ? normalizeDate(row.due_date) : null;

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? "",
    probability: Number(row.probability ?? 1),
    impact: Number(row.impact ?? 1),
    score: Number(row.score ?? 1),
    mitigationPlanA: row.mitigation_plan_a ?? null,
    mitigationPlanB: row.mitigation_plan_b ?? null,
    owner,
    followUpNotes: row.follow_up_notes ?? null,
    followUpFrequency: row.follow_up_frequency ?? null,
    category: buildCategoryMeta(row.category),
    lastFollowUpAt: normalizeDate(row.last_follow_up_at),
    dueDate: normalizedDue ? normalizedDue.slice(0, 10) : null,
    status: row.status,
    isArchived: row.is_archived ?? false,
    createdBy: row.created_by ?? null,
    updatedBy: row.updated_by ?? null,
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
};

const fetchProjectOrThrow = async (client, projectId) => {
  const exists = await ensureProjectExists(client, projectId);
  if (!exists) {
    throw createAppError("Project not found.", 404);
  }
};

const isProjectMember = async (client, projectId, employeeId, { requireLead = false } = {}) => {
  if (!employeeId) return false;
  const result = await isProjectMemberRepo(client, projectId, employeeId);
  if (!result.isMember) return false;
  return requireLead ? result.isLead : result.isMember;
};

const assertReadAccess = async (client, projectId, user) => {
  if (!user) {
    throw createAppError("Authentication required.", 401);
  }
  if (isAdmin(user)) {
    return;
  }
  const employeeId = user.employeeId ?? null;
  if (!employeeId) {
    throw createAppError("Forbidden: Missing employee link.", 403);
  }
  const member = await isProjectMember(client, projectId, employeeId);
  if (!member) {
    throw createAppError("Forbidden: Project membership required.", 403);
  }
};

const assertEditAccess = async (client, projectId, user) => {
  if (!user) {
    throw createAppError("Authentication required.", 401);
  }
  if (isAdmin(user)) {
    return;
  }
  if (!isProjectLeader(user)) {
    throw createAppError("Forbidden: Insufficient permissions.", 403);
  }
  const employeeId = user.employeeId ?? null;
  const hasLeadAccess = await isProjectMember(client, projectId, employeeId, { requireLead: true });
  if (!hasLeadAccess) {
    throw createAppError("Forbidden: Projektleder access requires project lead membership.", 403);
  }
};

const fetchRiskOrThrow = async (client, riskId) => {
  const row = await fetchRiskById(client, riskId);
  if (!row) {
    throw createAppError("Risk not found.", 404);
  }
  return row;
};

export const listProjectRisks = async (projectId, filters = {}, user, { client } = {}) => {
  const executor = client ?? pool;
  await fetchProjectOrThrow(executor, projectId);
  const effectiveUser = user ? { ...user } : null;
  if (effectiveUser && !effectiveUser.employeeId) {
    try {
      const linked = await ensureEmployeeLinkForUser(executor, user);
      if (linked) {
        effectiveUser.employeeId = linked.employeeId ?? null;
        effectiveUser.role = linked.role ?? user.role;
      }
    } catch {
      // ignore linkage errors; access check below will reject if needed
    }
  }
  await assertReadAccess(executor, projectId, effectiveUser ?? user);

  const parsedFilters = parseRiskFilters(filters);
  const rows = await listProjectRisksRepo(executor, { projectId, filters: parsedFilters });
  return rows.map(mapRiskRow);
};

const buildInsertPayload = (projectId, payload, user) => {
  const probability = payload.probability ?? 1;
  const impact = payload.impact ?? 1;
  const score = calculateRiskScore(probability, impact);
  return {
    projectId,
    title: payload.title,
    description: payload.description ?? null,
    probability,
    impact,
    score,
    mitigationPlanA: payload.mitigationPlanA ?? null,
    mitigationPlanB: payload.mitigationPlanB ?? null,
    ownerId: payload.ownerId ?? null,
    followUpNotes: payload.followUpNotes ?? null,
    followUpFrequency: payload.followUpFrequency ?? null,
    category: payload.category ?? null,
    lastFollowUpAt: payload.lastFollowUpAt ?? null,
    dueDate: payload.dueDate ?? null,
    status: payload.status ?? "open",
    createdBy: user?.id ?? null,
  };
};

export const createProjectRisk = async (projectId, payload, user, options = {}) => {
  return withTransaction(async (client) => {
    await fetchProjectOrThrow(client, projectId);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertEditAccess(client, projectId, effectiveUser);

    const parsedPayload = parseCreateRiskPayload(payload);
    const insertPayload = buildInsertPayload(projectId, parsedPayload, effectiveUser);
    const row = await insertProjectRisk(client, insertPayload);
    return mapRiskRow(row);
  }, options);
};

const buildUpdatePayload = (riskRow, updates, user) => {
  const nextProbability = updates.probability ?? Number(riskRow.probability ?? 1);
  const nextImpact = updates.impact ?? Number(riskRow.impact ?? 1);
  const score = calculateRiskScore(nextProbability, nextImpact);
  return {
    ...updates,
    score,
    updatedBy: user?.id ?? null,
  };
};

export const updateProjectRisk = async (riskId, updates, user, options = {}) => {
  return withTransaction(async (client) => {
    const riskRow = await fetchRiskOrThrow(client, riskId);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertEditAccess(client, riskRow.project_id, effectiveUser);

    const parsedUpdates = parseUpdateRiskPayload(updates);
    const updatePayload = buildUpdatePayload(riskRow, parsedUpdates, effectiveUser);
    const row = await updateProjectRiskRepo(client, { riskId, updates: updatePayload });
    return mapRiskRow(row);
  }, options);
};

export const archiveProjectRisk = async (riskId, user, options = {}) => {
  return withTransaction(async (client) => {
    const riskRow = await fetchRiskOrThrow(client, riskId);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertEditAccess(client, riskRow.project_id, effectiveUser);

    await archiveProjectRiskRepo(client, riskId, effectiveUser.id ?? null);

    return { success: true };
  }, options);
};
