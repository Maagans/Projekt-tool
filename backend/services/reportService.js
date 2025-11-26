import pool from "../db.js";
import { randomUUID } from "crypto";
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
import { listPlanByProject } from "../repositories/projectPlanRepository.js";

const clampPercentage = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, numeric));
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(yearStr) || !Number.isFinite(monthStr) || !Number.isFinite(dayStr)) return null;
  return new Date(Date.UTC(yearStr, monthStr - 1, dayStr));
};

const calculatePositionFromDate = (dateOnly, rangeStart, rangeEnd) => {
  const start = parseDateOnly(rangeStart);
  const end = parseDateOnly(rangeEnd);
  const target = parseDateOnly(dateOnly);
  if (!start || !end || !target || end <= start) return null;
  const ratio = (target.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  if (!Number.isFinite(ratio)) return null;
  return clampPercentage(ratio * 100);
};

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
    `SELECT id::text, start_date, end_date FROM projects WHERE id = $1::uuid LIMIT 1`,
    [projectId],
  );
  if (result.rowCount === 0) {
    throw createAppError("Project not found.", 404);
  }
  const row = result.rows[0];
  return {
    id: row.id,
    startDate: row.start_date ? row.start_date.toISOString().slice(0, 10) : null,
    endDate: row.end_date ? row.end_date.toISOString().slice(0, 10) : null,
  };
};

const fetchReportOrThrow = async (client, reportId) => {
  const report = await getReportById(client, reportId);
  if (!report) {
    throw createAppError("Report not found.", 404);
  }
  return report;
};

const buildPlanSnapshotState = async (client, projectId, projectMeta = {}) => {
  const plan = await listPlanByProject(client, projectId);
  const dates = [];
  const collectDate = (value) => {
    const parsed = parseDateOnly(value);
    if (parsed) dates.push(parsed);
  };

  plan.phases?.forEach((p) => {
    collectDate(p.startDate);
    collectDate(p.endDate);
  });
  plan.milestones?.forEach((m) => collectDate(m.dueDate));
  plan.deliverables?.forEach((d) => {
    collectDate(d.startDate);
    collectDate(d.endDate);
  });

  const derivedStart = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString().slice(0, 10) : null;
  const derivedEnd = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString().slice(0, 10) : null;

  const projectStartDate = projectMeta.startDate ? new Date(projectMeta.startDate) : null;
  const projectEndDate = projectMeta.endDate ? new Date(projectMeta.endDate) : null;

  const derivedStartDate = derivedStart ? new Date(derivedStart) : null;
  const derivedEndDate = derivedEnd ? new Date(derivedEnd) : null;

  // Calculate effective range: Union of project config range and item range
  const effectiveStart = projectStartDate && derivedStartDate
    ? new Date(Math.min(projectStartDate.getTime(), derivedStartDate.getTime()))
    : (projectStartDate ?? derivedStartDate);

  const effectiveEnd = projectEndDate && derivedEndDate
    ? new Date(Math.max(projectEndDate.getTime(), derivedEndDate.getTime()))
    : (projectEndDate ?? derivedEndDate);

  const rangeStart = effectiveStart ? effectiveStart.toISOString().slice(0, 10) : null;
  const rangeEnd = effectiveEnd ? effectiveEnd.toISOString().slice(0, 10) : null;

  const mapId = new Map();
  const remap = (id) => {
    if (!id) return randomUUID();
    if (!mapId.has(id)) {
      mapId.set(id, randomUUID());
    }
    return mapId.get(id);
  };

  const milestoneDateLookup = new Map();
  plan.milestones?.forEach((milestone) => {
    if (milestone?.id && milestone?.dueDate) {
      milestoneDateLookup.set(milestone.id, milestone.dueDate);
    }
  });

  const phases =
    plan.phases?.map((p) => {
      const startFromPercentage = clampPercentage(p.startPercentage);
      const endFromPercentage = clampPercentage(p.endPercentage);
      const startFromDate = calculatePositionFromDate(p.startDate, rangeStart, rangeEnd);
      const endFromDate = calculatePositionFromDate(p.endDate ?? p.startDate, rangeStart, rangeEnd);
      const start = startFromDate ?? startFromPercentage ?? 0;
      const end = endFromDate ?? endFromPercentage ?? start;
      return {
        id: remap(p.id),
        text: p.label ?? "",
        start,
        end,
        highlight: p.highlight ?? "",
        workstreamId: p.workstreamId ?? null,
        startDate: p.startDate ?? null,
        endDate: p.endDate ?? null,
        status: p.status ?? null,
      };
    }) ?? [];

  const milestones =
    plan.milestones?.map((m, index) => {
      const positionFromDate = calculatePositionFromDate(m.dueDate, rangeStart, rangeEnd);
      const position = positionFromDate ?? clampPercentage(m.position) ?? index;
      return {
        id: remap(m.id),
        text: m.label ?? "",
        position,
        workstreamId: m.workstreamId ?? null,
        date: m.dueDate ?? null,
        status: m.status ?? null,
      };
    }) ?? [];

  const deliverables =
    plan.deliverables?.map((d, index) => {
      const anchorDate = d.startDate ?? d.endDate ?? milestoneDateLookup.get(d.milestoneId) ?? null;
      const positionFromDate = calculatePositionFromDate(anchorDate, rangeStart, rangeEnd);
      const position = positionFromDate ?? clampPercentage(d.position) ?? index;
      return {
        id: remap(d.id),
        text: d.label ?? "",
        position,
        milestoneId: d.milestoneId ? remap(d.milestoneId) : null,
        status: d.status ?? null,
        owner: d.ownerName ?? null,
        ownerId: d.ownerEmployeeId ?? null,
        description: d.description ?? null,
        notes: d.notes ?? null,
        startDate: d.startDate ?? null,
        endDate: d.endDate ?? null,
        progress: d.progress ?? null,
        checklist: (d.checklist ?? []).map((item, itemIndex) => ({
          id: remap(item.id),
          text: item.text ?? "",
          completed: item.completed ?? false,
          position: itemIndex,
        })),
      };
    }) ?? [];

  return { phases, milestones, deliverables, startDate: rangeStart, endDate: rangeEnd };
};

const stripPlanFields = (state = {}) => {
  const { phases, milestones, deliverables, workstreams, startDate, endDate, ...rest } = state;
  return rest;
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
    const projectMeta = await ensureProjectExists(client, projectId);
    await assertProjectEditAccess(client, projectId, effectiveUser);

    const { weekKey, state = {} } = payload ?? {};
    if (!weekKey) {
      throw createAppError("weekKey is required.", 400);
    }

    const planState = await buildPlanSnapshotState(client, projectId, projectMeta);
    const baseState = {
      statusItems: [],
      challengeItems: [],
      nextStepItems: [],
      mainTableRows: [],
      risks: [],
      kanbanTasks: [],
      ...state,
      phases: planState.phases,
      milestones: planState.milestones,
      deliverables: planState.deliverables,
      startDate: planState.startDate,
      endDate: planState.endDate,
    };

    const newId = await repoCreateReport(client, projectId, weekKey);
    await replaceReportState(client, newId, baseState);
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
      const currentState = await getReportState(client, reportId);
      const merged = {
        ...currentState,
        ...stripPlanFields(state),
        phases: currentState.phases ?? [],
        milestones: currentState.milestones ?? [],
        deliverables: currentState.deliverables ?? [],
        workstreams: currentState.workstreams ?? [],
      };
      await replaceReportState(client, reportId, merged);
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
