import pool from "../db.js";
import { createAppError } from "../utils/errors.js";
import { withTransaction } from "../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "./workspaceService.js";
import {
  getReportsByProjectId,
  getReportById,
  getReportState,
  createReport as repoCreateReport,
  updateReportWeekKey,
  replaceReportState,
  deleteReport as repoDeleteReport,
} from "../repositories/reportRepository.js";

const assertAuthenticated = (user) => {
  if (!user) {
    throw createAppError("Authentication required.", 401);
  }
};

const assertProjectReadAccess = async (client, projectId, user) => {
  assertAuthenticated(user);
  if (user.role === "Administrator") return;
  const employeeId = user.employeeId ?? null;
  if (!employeeId) {
    throw createAppError("Forbidden: Missing employee link.", 403);
  }
  const memberResult = await client.query(
    `
      SELECT 1
      FROM project_members
      WHERE project_id = $1::uuid AND employee_id = $2::uuid
      LIMIT 1
    `,
    [projectId, employeeId],
  );
  if (memberResult.rowCount === 0) {
    throw createAppError("Forbidden: Project membership required.", 403);
  }
};

const assertProjectEditAccess = async (client, projectId, user) => {
  assertAuthenticated(user);
  if (user.role === "Administrator") return;
  if (user.role !== "Projektleder") {
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
    throw createAppError("Forbidden: Only projectledere for projektet kan opdatere rapporter.", 403);
  }
};

const ensureProjectExists = async (client, projectId) => {
  const result = await client.query(
    `SELECT id::text FROM projects WHERE id = $1::uuid LIMIT 1`,
    [projectId],
  );
  if (result.rowCount === 0) {
    throw createAppError("Project not found.", 404);
  }
};

const fetchReportOrThrow = async (client, reportId) => {
  const report = await getReportById(client, reportId);
  if (!report) {
    throw createAppError("Report not found.", 404);
  }
  return report;
};

export const listProjectReports = async (projectId, user) => {
  return withTransaction(async (client) => {
    assertAuthenticated(user);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await ensureProjectExists(client, projectId);
    await assertProjectReadAccess(client, projectId, effectiveUser);
    const reports = await getReportsByProjectId(client, projectId);
    return reports;
  }, { client: pool });
};

export const getReport = async (reportId, user) => {
  return withTransaction(async (client) => {
    const report = await fetchReportOrThrow(client, reportId);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertProjectReadAccess(client, report.projectId, effectiveUser);
    const state = await getReportState(client, report.id);
    return { ...report, state };
  }, { client: pool });
};

export const createReport = async (projectId, payload, user) => {
  return withTransaction(async (client) => {
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await ensureProjectExists(client, projectId);
    await assertProjectEditAccess(client, projectId, effectiveUser);

    const { weekKey, state = {} } = payload ?? {};
    if (!weekKey) {
      throw createAppError("weekKey is required.", 400);
    }

    const newId = await repoCreateReport(client, projectId, weekKey);
    await replaceReportState(client, newId, state);
    const createdState = await getReportState(client, newId);
    return { id: newId, projectId, weekKey, state: createdState };
  }, { client: pool });
};

export const updateReport = async (reportId, payload, user) => {
  return withTransaction(async (client) => {
    const report = await fetchReportOrThrow(client, reportId);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertProjectEditAccess(client, report.projectId, effectiveUser);

    const { weekKey, state } = payload ?? {};
    if (weekKey) {
      await updateReportWeekKey(client, reportId, weekKey);
    }
    if (state) {
      await replaceReportState(client, reportId, state);
    }
    const updatedState = await getReportState(client, reportId);
    return { id: report.id, projectId: report.projectId, weekKey: weekKey ?? report.weekKey, state: updatedState };
  }, { client: pool });
};

export const deleteReport = async (reportId, user) => {
  return withTransaction(async (client) => {
    const report = await fetchReportOrThrow(client, reportId);
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await assertProjectEditAccess(client, report.projectId, effectiveUser);
    await repoDeleteReport(client, reportId);
  }, { client: pool });
};
