import pool from "../../db.js";
import { createAppError } from "../../utils/errors.js";
import { withTransaction } from "../../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "../workspaceService.js";
import {
  buildCategoryMeta,
  calculateRiskScore,
  normalizeRiskCategory,
  PROJECT_RISK_STATUSES,
  assertRiskScale,
} from "./riskSchema.js";

const SELECT_FIELDS = `
  r.id::text AS id,
  r.project_id::text AS project_id,
  r.title,
  r.description,
  r.probability::int,
  r.impact::int,
  r.score::int,
  r.mitigation_plan_a,
  r.mitigation_plan_b,
  r.owner_id::text AS owner_id,
  e.name AS owner_name,
  e.email AS owner_email,
  r.follow_up_notes,
  r.follow_up_frequency,
  r.category,
  r.last_follow_up_at,
  r.due_date,
  r.status,
  r.is_archived,
  r.created_by::text AS created_by,
  r.updated_by::text AS updated_by,
  r.created_at,
  r.updated_at
`;

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
  const result = await client.query(
    `SELECT id::text FROM projects WHERE id = $1::uuid LIMIT 1`,
    [projectId],
  );
  if (result.rowCount === 0) {
    throw createAppError("Project not found.", 404);
  }
};

const isProjectMember = async (client, projectId, employeeId, { requireLead = false } = {}) => {
  if (!employeeId) return false;
  const result = await client.query(
    `
      SELECT is_project_lead
      FROM project_members
      WHERE project_id = $1::uuid AND employee_id = $2::uuid
      LIMIT 1
    `,
    [projectId, employeeId],
  );
  if (result.rowCount === 0) {
    return false;
  }
  if (!requireLead) {
    return true;
  }
  return result.rows[0].is_project_lead === true;
};

const assertReadAccess = async (client, projectId, user) => {
  if (!user) {
    throw createAppError("Authentication required.", 401);
  }
  if (user.role === "Administrator") {
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
  if (user.role === "Administrator") {
    return;
  }
  if (user.role !== "Projektleder") {
    throw createAppError("Forbidden: Insufficient permissions.", 403);
  }
  const employeeId = user.employeeId ?? null;
  const hasLeadAccess = await isProjectMember(client, projectId, employeeId, { requireLead: true });
  if (!hasLeadAccess) {
    throw createAppError("Forbidden: Projektleder access requires project lead membership.", 403);
  }
};

const buildListFilters = ({ includeArchived = false, status, ownerId, category, overdue = false } = {}) => {
  const clauses = ["r.project_id = $1::uuid"];
  const params = [];
  let paramIndex = 2;

  if (!includeArchived) {
    clauses.push("r.is_archived = false");
  }

  if (status) {
    clauses.push(`r.status = $${paramIndex++}`);
    params.push(status);
  }

  if (ownerId) {
    clauses.push(`r.owner_id = $${paramIndex++}::uuid`);
    params.push(ownerId);
  }

  if (category) {
    clauses.push(`r.category = $${paramIndex++}`);
    params.push(category);
  }

  if (overdue) {
    clauses.push(`r.due_date IS NOT NULL AND r.due_date < CURRENT_DATE AND r.status <> 'closed'`);
  }

  return { clauses, params };
};

const fetchRiskOrThrow = async (client, riskId) => {
  const result = await client.query(
    `
      SELECT ${SELECT_FIELDS}
      FROM project_risks r
      LEFT JOIN employees e ON e.id = r.owner_id
      WHERE r.id = $1::uuid
      LIMIT 1
    `,
    [riskId],
  );
  if (result.rowCount === 0) {
    throw createAppError("Risk not found.", 404);
  }
  return result.rows[0];
};

const normalizeStatus = (status) => {
  if (!status) {
    return "open";
  }
  const normalized = status.trim().toLowerCase();
  if (!PROJECT_RISK_STATUSES.includes(normalized)) {
    throw createAppError("Invalid risk status value.", 400);
  }
  return normalized;
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

  const { clauses, params } = buildListFilters(filters);
  const queryText = `
    SELECT ${SELECT_FIELDS}
    FROM project_risks r
    LEFT JOIN employees e ON e.id = r.owner_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY r.updated_at DESC
  `;
  const result = await executor.query(queryText, [projectId, ...params]);
  return result.rows.map(mapRiskRow);
};

const prepareInsertParams = (projectId, payload, user) => {
  const probability = assertRiskScale(payload.probability ?? 1, "probability");
  const impact = assertRiskScale(payload.impact ?? 1, "impact");
  const score = calculateRiskScore(probability, impact);
  const category = normalizeRiskCategory(payload.category);
  const status = normalizeStatus(payload.status ?? "open");

  return {
    projectId,
    title: payload.title.trim(),
    description: payload.description ?? null,
    probability,
    impact,
    score,
    mitigationPlanA: payload.mitigationPlanA ?? null,
    mitigationPlanB: payload.mitigationPlanB ?? null,
    ownerId: payload.ownerId ?? null,
    followUpNotes: payload.followUpNotes ?? null,
    followUpFrequency: payload.followUpFrequency ?? null,
    category,
    lastFollowUpAt: payload.lastFollowUpAt ?? null,
    dueDate: payload.dueDate ?? null,
    status,
    createdBy: user?.id ?? null,
  };
};

export const createProjectRisk = async (projectId, payload, user, options = {}) => {
  return withTransaction(async (client) => {
    await fetchProjectOrThrow(client, projectId);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertEditAccess(client, projectId, effectiveUser);

    const insertPayload = prepareInsertParams(projectId, payload, effectiveUser);
    const result = await client.query(
      `
        WITH inserted AS (
          INSERT INTO project_risks (
            project_id, title, description, probability, impact, score,
            mitigation_plan_a, mitigation_plan_b, owner_id,
            follow_up_notes, follow_up_frequency, category,
            last_follow_up_at, due_date, status, created_by, updated_by
          )
          VALUES (
            $1::uuid, $2, $3, $4, $5, $6,
            $7, $8, $9::uuid,
            $10, $11, $12,
            $13, $14, $15, $16::uuid, $16::uuid
          )
          RETURNING *
        )
        SELECT ${SELECT_FIELDS}
        FROM inserted r
        LEFT JOIN employees e ON e.id = r.owner_id
      `,
      [
        insertPayload.projectId,
        insertPayload.title,
        insertPayload.description,
        insertPayload.probability,
        insertPayload.impact,
        insertPayload.score,
        insertPayload.mitigationPlanA,
        insertPayload.mitigationPlanB,
        insertPayload.ownerId,
        insertPayload.followUpNotes,
        insertPayload.followUpFrequency,
        insertPayload.category,
        insertPayload.lastFollowUpAt,
        insertPayload.dueDate,
        insertPayload.status,
        insertPayload.createdBy,
      ],
    );

    return mapRiskRow(result.rows[0]);
  }, options);
};

const buildUpdateStatement = (riskRow, updates, user) => {
  const sets = [];
  const params = [];
  let index = 1;

  if (updates.title !== undefined) {
    sets.push(`title = $${index++}`);
    params.push(updates.title.trim());
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${index++}`);
    params.push(updates.description);
  }
  let probability = Number(riskRow.probability);
  let impact = Number(riskRow.impact);
  if (updates.probability !== undefined) {
    probability = assertRiskScale(updates.probability, "probability");
    sets.push(`probability = $${index++}`);
    params.push(probability);
  }
  if (updates.impact !== undefined) {
    impact = assertRiskScale(updates.impact, "impact");
    sets.push(`impact = $${index++}`);
    params.push(impact);
  }
  if (updates.mitigationPlanA !== undefined) {
    sets.push(`mitigation_plan_a = $${index++}`);
    params.push(updates.mitigationPlanA);
  }
  if (updates.mitigationPlanB !== undefined) {
    sets.push(`mitigation_plan_b = $${index++}`);
    params.push(updates.mitigationPlanB);
  }
  if (updates.ownerId !== undefined) {
    sets.push(`owner_id = $${index++}::uuid`);
    params.push(updates.ownerId);
  }
  if (updates.followUpNotes !== undefined) {
    sets.push(`follow_up_notes = $${index++}`);
    params.push(updates.followUpNotes);
  }
  if (updates.followUpFrequency !== undefined) {
    sets.push(`follow_up_frequency = $${index++}`);
    params.push(updates.followUpFrequency);
  }
  if (updates.category !== undefined) {
    sets.push(`category = $${index++}`);
    params.push(normalizeRiskCategory(updates.category));
  }
  if (updates.lastFollowUpAt !== undefined) {
    sets.push(`last_follow_up_at = $${index++}`);
    params.push(updates.lastFollowUpAt);
  }
  if (updates.dueDate !== undefined) {
    sets.push(`due_date = $${index++}`);
    params.push(updates.dueDate);
  }
  if (updates.status !== undefined) {
    sets.push(`status = $${index++}`);
    params.push(normalizeStatus(updates.status));
  }
  if (updates.isArchived !== undefined) {
    sets.push(`is_archived = $${index++}`);
    params.push(Boolean(updates.isArchived));
  }

  const nextScore = calculateRiskScore(probability, impact);
  sets.push(`score = $${index++}`);
  params.push(nextScore);
  sets.push(`updated_by = $${index++}::uuid`);
  params.push(user?.id ?? null);
  sets.push(`updated_at = NOW()`);

  return { sets, params };
};

export const updateProjectRisk = async (riskId, updates, user, options = {}) => {
  return withTransaction(async (client) => {
    const riskRow = await fetchRiskOrThrow(client, riskId);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertEditAccess(client, riskRow.project_id, effectiveUser);

    const { sets, params } = buildUpdateStatement(riskRow, updates, effectiveUser);
    if (sets.length === 1 && sets[0] === "updated_at = NOW()") {
      throw createAppError("No valid risk fields provided for update.", 400);
    }

    const query = `
      UPDATE project_risks r
      SET ${sets.join(", ")}
      WHERE r.id = $${params.length + 1}::uuid
      RETURNING ${SELECT_FIELDS}
    `;
    const result = await client.query(query, [...params, riskId]);
    return mapRiskRow(result.rows[0]);
  }, options);
};

export const archiveProjectRisk = async (riskId, user, options = {}) => {
  return withTransaction(async (client) => {
    const riskRow = await fetchRiskOrThrow(client, riskId);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertEditAccess(client, riskRow.project_id, effectiveUser);

    await client.query(
      `
        UPDATE project_risks
        SET is_archived = true, status = 'closed',
            updated_by = $1::uuid, updated_at = NOW()
        WHERE id = $2::uuid
      `,
      [effectiveUser.id ?? null, riskId],
    );

    return { success: true };
  }, options);
};
