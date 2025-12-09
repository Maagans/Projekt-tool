import pool from "../db.js";
import { randomUUID } from "crypto";
import { createAppError } from "../utils/errors.js";
import { withTransaction } from "../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "./workspaceService.js";
import { isAdmin, isProjectLeader } from "../utils/permissions.js";
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
import { findByIdForUpdate } from "../repositories/projectRepository.js";
import { toDateOnly } from "../utils/helpers.js";

const assertAuthenticated = (user) => {
  if (!user) {
    throw createAppError("Authentication required.", 401);
  }
};

const assertProjectReadAccess = async (client, projectId, user) => {
  assertAuthenticated(user);
  if (isAdmin(user)) return;
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
  if (isAdmin(user)) return;
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

const buildPlanSnapshotState = async (client, projectId) => {
  const plan = await listPlanByProject(client, projectId);
  const projectConfig = await findByIdForUpdate(client, projectId);

  const mapId = new Map();
  const remap = (id) => {
    if (!id) return randomUUID();
    if (!mapId.has(id)) {
      mapId.set(id, randomUUID());
    }
    return mapId.get(id);
  };

  // 1. Collect all dates to find the effective range
  const dateCandidates = [];
  const collectDate = (val) => {
    const d = toDateOnly(val);
    if (d) dateCandidates.push(new Date(d));
  };

  plan.phases?.forEach(p => { collectDate(p.startDate); collectDate(p.endDate); });
  plan.milestones?.forEach(m => collectDate(m.dueDate));
  plan.deliverables?.forEach(d => { collectDate(d.startDate); collectDate(d.endDate); });

  const derivedStart = dateCandidates.length ? new Date(Math.min(...dateCandidates)) : null;
  const derivedEnd = dateCandidates.length ? new Date(Math.max(...dateCandidates)) : null;

  const configStart = projectConfig?.startDate ? new Date(projectConfig.startDate) : null;
  const configEnd = projectConfig?.endDate ? new Date(projectConfig.endDate) : null;

  // Union of project config and item range
  const effectiveStart = configStart && derivedStart
    ? new Date(Math.min(configStart.getTime(), derivedStart.getTime()))
    : (configStart ?? derivedStart);

  const effectiveEnd = configEnd && derivedEnd
    ? new Date(Math.max(configEnd.getTime(), derivedEnd.getTime()))
    : (configEnd ?? derivedEnd);

  const rangeStart = effectiveStart;
  const rangeEnd = effectiveEnd;

  const clampPercentage = (val) => Math.min(100, Math.max(0, val));

  const calcPosFromDate = (dateStr) => {
    const target = toDateOnly(dateStr);
    if (!rangeStart || !rangeEnd || !target) return null;
    const t = new Date(target);
    if (rangeEnd <= rangeStart) return null;
    const ratio = (t.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime());
    return clampPercentage(ratio * 100);
  };

  const phases =
    plan.phases?.map((p) => {
      const start = calcPosFromDate(p.startDate) ?? p.startPercentage ?? 0;
      const end = calcPosFromDate(p.endDate ?? p.startDate) ?? p.endPercentage ?? start;
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
      const position = calcPosFromDate(m.dueDate) ?? m.position ?? index;
      return {
        id: remap(m.id),
        text: m.label ?? "",
        position,
        workstreamId: m.workstreamId ?? null,
        date: m.dueDate ?? null,
        status: m.status ?? null,
      };
    }) ?? [];

  const milestoneLookup = new Map();
  plan.milestones?.forEach(m => milestoneLookup.set(m.id, remap(m.id)));

  const deliverables =
    plan.deliverables?.map((d, index) => {
      // Anchor date logic similar to frontend: start > end > milestone due date
      let anchorDate = d.startDate ?? d.endDate;
      if (!anchorDate && d.milestoneId) {
        const m = plan.milestones?.find(x => x.id === d.milestoneId);
        if (m) anchorDate = m.dueDate;
      }
      const position = calcPosFromDate(anchorDate) ?? d.position ?? index;

      return {
        id: remap(d.id),
        text: d.label ?? "",
        position,
        milestoneId: d.milestoneId ? milestoneLookup.get(d.milestoneId) : null,
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

  return {
    phases,
    milestones,
    deliverables,
    startDate: rangeStart ? toDateOnly(rangeStart) : null,
    endDate: rangeEnd ? toDateOnly(rangeEnd) : null
  };
};

const stripPlanFields = (state = {}) => {
  const rest = { ...state };
  delete rest.phases;
  delete rest.milestones;
  delete rest.deliverables;
  delete rest.workstreams;
  // We keep startDate/endDate if they exist, as they are part of the snapshot context now
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
    await ensureProjectExists(client, projectId);
    await assertProjectEditAccess(client, projectId, effectiveUser);

    const { weekKey, state = {} } = payload ?? {};
    if (!weekKey) {
      throw createAppError("weekKey is required.", 400);
    }

    const planState = await buildPlanSnapshotState(client, projectId);
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
