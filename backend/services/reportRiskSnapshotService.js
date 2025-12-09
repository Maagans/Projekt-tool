import pool from "../db.js";
import { createAppError } from "../utils/errors.js";
import { classifyReportIdentifier, ensureUuid } from "../utils/helpers.js";
import { ensureEmployeeLinkForUser } from "./workspaceService.js";
import { withTransaction } from "../utils/transactions.js";
import { assertRiskScale, calculateRiskScore } from "./risk/riskSchema.js";
import { isAdmin, isProjectLeader } from "../utils/permissions.js";

const fetchReportContext = async (client, reportId) => {
  const { value, sqlType } = classifyReportIdentifier(reportId);
  const result = await client.query(
    {
      text: `SELECT id::text, project_id::text, week_key FROM reports WHERE id = $1::${sqlType} LIMIT 1`,
      values: [value],
    },
  );
  if (result.rowCount === 0) {
    throw createAppError("Report not found.", 404);
  }
  return result.rows[0];
};

const assertProjectEditAccess = async (client, projectId, user) => {
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
  if (!employeeId) {
    throw createAppError("Forbidden: Missing employee link.", 403);
  }
  const leadResult = await client.query(
    `
      SELECT 1
      FROM project_members
      WHERE project_id = $1::uuid AND employee_id = $2::uuid AND is_project_lead = true
      LIMIT 1
    `,
    [projectId, employeeId],
  );
  if (leadResult.rowCount === 0) {
    throw createAppError("Forbidden: Only projectledere for projektet kan opdatere rapportrisici.", 403);
  }
};

const SNAPSHOT_SELECT_FIELDS = `
  s.id::text,
  s.report_id::text,
  s.project_risk_id::text,
  s.title,
  s.description,
  s.probability,
  s.impact,
  s.score,
  s.category,
  s.status,
  s.owner_name,
  s.owner_email,
  s.mitigation_plan_a,
  s.mitigation_plan_b,
  s.follow_up_notes,
  s.follow_up_frequency,
  s.due_date,
  s.last_follow_up_at,
  s.created_at,
  pr.is_archived AS project_risk_archived,
  pr.updated_at AS project_risk_updated_at
`;

const mapSnapshotRow = (row) => ({
  id: row.id,
  reportId: row.report_id,
  projectRiskId: row.project_risk_id,
  title: row.title,
  description: row.description ?? null,
  probability: Number(row.probability ?? 1),
  impact: Number(row.impact ?? 1),
  score: Number(row.score ?? 1),
  category: row.category ?? "other",
  status: row.status ?? "open",
  ownerName: row.owner_name ?? null,
  ownerEmail: row.owner_email ?? null,
  mitigationPlanA: row.mitigation_plan_a ?? null,
  mitigationPlanB: row.mitigation_plan_b ?? null,
  followUpNotes: row.follow_up_notes ?? null,
  followUpFrequency: row.follow_up_frequency ?? null,
  dueDate: row.due_date ?? null,
  lastFollowUpAt: row.last_follow_up_at ?? null,
  createdAt: row.created_at,
  projectRiskArchived: row.project_risk_archived ?? false,
  projectRiskUpdatedAt: row.project_risk_updated_at ?? null,
});

const fetchSnapshotsForReport = async (client, reportId) => {
  const { value, sqlType } = classifyReportIdentifier(reportId);
  const result = await client.query(
    {
      text: `
        SELECT
          ${SNAPSHOT_SELECT_FIELDS}
        FROM report_risk_snapshots s
        LEFT JOIN project_risks pr ON pr.id = s.project_risk_id
        WHERE s.report_id = $1::${sqlType}
        ORDER BY s.created_at ASC
      `,
      values: [value],
    },
  );
  return result.rows.map(mapSnapshotRow);
};

export const attachReportRisks = async (reportId, riskIds = [], user, options = {}) => {
  if (!Array.isArray(riskIds)) {
    throw createAppError("riskIds must be an array of project risk identifiers.", 400);
  }
  const cleanedIds = riskIds
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => Boolean(value))
    .map((value) => ensureUuid(value));

  const reportIdentifier = classifyReportIdentifier(reportId);

  return withTransaction(
    async (client) => {
      const report = await fetchReportContext(client, reportId);
      const effectiveUser = await ensureEmployeeLinkForUser(client, user);
      await assertProjectEditAccess(client, report.project_id, effectiveUser);

      await client.query({
        text: `DELETE FROM report_risk_snapshots WHERE report_id = $1::${reportIdentifier.sqlType}`,
        values: [reportIdentifier.value],
      });

      if (cleanedIds.length > 0) {
        await client.query(
          `
            INSERT INTO report_risk_snapshots (
              report_id,
              project_risk_id,
              title,
              description,
              probability,
              impact,
              score,
              category,
              status,
              owner_name,
              owner_email,
              mitigation_plan_a,
              mitigation_plan_b,
              follow_up_notes,
              follow_up_frequency,
              due_date,
              last_follow_up_at
            )
            SELECT
              $1::${reportIdentifier.sqlType},
              pr.id,
              pr.title,
              pr.description,
              pr.probability,
              pr.impact,
              pr.score,
              pr.category,
              pr.status,
              e.name,
              e.email,
              pr.mitigation_plan_a,
              pr.mitigation_plan_b,
              pr.follow_up_notes,
              pr.follow_up_frequency,
              pr.due_date,
              pr.last_follow_up_at
            FROM project_risks pr
            LEFT JOIN employees e ON e.id = pr.owner_id
            WHERE pr.id = ANY($2::uuid[])
              AND pr.project_id = $3::uuid
          `,
          [reportIdentifier.value, cleanedIds, report.project_id],
        );
      }

      const snapshots = await fetchSnapshotsForReport(client, reportId);
      return { report, snapshots };
    },
    { client: options.client },
  );
};

export const listReportRiskSnapshots = async (reportId, options = {}) => {
  const client = options.client ?? pool;
  return fetchSnapshotsForReport(client, reportId);
};

const fetchSnapshotById = async (client, snapshotId) => {
  const result = await client.query(
    {
      text: `
        SELECT
          ${SNAPSHOT_SELECT_FIELDS}
        FROM report_risk_snapshots s
        LEFT JOIN project_risks pr ON pr.id = s.project_risk_id
        WHERE s.id = $1::uuid
        LIMIT 1
      `,
      values: [snapshotId],
    },
  );
  if (result.rowCount === 0) {
    throw createAppError("Snapshot not found.", 404);
  }
  return mapSnapshotRow(result.rows[0]);
};

export const updateReportRiskSnapshot = async (reportId, snapshotId, updates = {}, user, options = {}) => {
  const probability = assertRiskScale(updates.probability, "probability");
  const impact = assertRiskScale(updates.impact, "impact");
  const score = calculateRiskScore(probability, impact);
  const reportIdentifier = classifyReportIdentifier(reportId);
  const snapshotUuid = ensureUuid(snapshotId);

  return withTransaction(
    async (client) => {
      const report = await fetchReportContext(client, reportId);
      const effectiveUser = await ensureEmployeeLinkForUser(client, user);
      await assertProjectEditAccess(client, report.project_id, effectiveUser);

      const ownershipResult = await client.query(
        {
          text: `
            SELECT 1
            FROM report_risk_snapshots
            WHERE id = $1::uuid AND report_id = $2::${reportIdentifier.sqlType}
            LIMIT 1
          `,
          values: [snapshotUuid, reportIdentifier.value],
        },
      );

      if (ownershipResult.rowCount === 0) {
        throw createAppError("Snapshot not found for report.", 404);
      }

      await client.query(
        {
          text: `
            UPDATE report_risk_snapshots
            SET probability = $1, impact = $2, score = $3
            WHERE id = $4::uuid
          `,
          values: [probability, impact, score, snapshotUuid],
        },
      );

      return fetchSnapshotById(client, snapshotUuid);
    },
    { client: options.client },
  );
};
