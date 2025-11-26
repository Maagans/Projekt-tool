import pg from 'pg';
import { randomUUID } from 'crypto';
import { config } from '../config/index.js';
import { listPlanByProject } from '../repositories/projectPlanRepository.js';
import {
  getReportsByProjectId,
  getReportState,
  replaceReportState,
} from '../repositories/reportRepository.js';

const { Pool } = pg;

const clampPercentage = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, numeric));
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split('-').map((part) => Number.parseInt(part, 10));
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

const buildPlanState = (plan, projectMeta = {}) => {
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

  const projectStartDate = projectMeta.startDate ?? derivedStart;
  const projectEndDate = projectMeta.endDate ?? derivedEnd;
  const idMap = new Map();
  const remap = (id) => {
    if (!id) return randomUUID();
    if (!idMap.has(id)) idMap.set(id, randomUUID());
    return idMap.get(id);
  };

  const milestoneDateLookup = new Map();
  plan.milestones?.forEach((m) => {
    if (m?.id && m?.dueDate) {
      milestoneDateLookup.set(m.id, m.dueDate);
    }
  });

  const phases =
    plan.phases?.map((p) => {
      const startFromPercentage = clampPercentage(p.startPercentage);
      const endFromPercentage = clampPercentage(p.endPercentage);
      const startFromDate = calculatePositionFromDate(p.startDate, projectStartDate, projectEndDate);
      const endFromDate = calculatePositionFromDate(p.endDate ?? p.startDate, projectStartDate, projectEndDate);
      const start = startFromPercentage ?? startFromDate ?? 0;
      const end = endFromPercentage ?? endFromDate ?? start;
      return {
        id: remap(p.id),
        text: p.label ?? '',
        start,
        end,
        highlight: p.highlight ?? '',
        workstreamId: p.workstreamId ?? null,
        startDate: p.startDate ?? null,
        endDate: p.endDate ?? null,
        status: p.status ?? null,
      };
    }) ?? [];

  const milestones =
    plan.milestones?.map((m, idx) => {
      const positionFromDate = calculatePositionFromDate(m.dueDate, projectStartDate, projectEndDate);
      const position = clampPercentage(m.position) ?? positionFromDate ?? idx;
      return {
        id: remap(m.id),
        text: m.label ?? '',
        position,
        workstreamId: m.workstreamId ?? null,
        date: m.dueDate ?? null,
        status: m.status ?? null,
      };
    }) ?? [];

  const milestoneLookup = new Map();
  plan.milestones?.forEach((m) => milestoneLookup.set(m.id, remap(m.id)));

  const deliverables =
    plan.deliverables?.map((d, idx) => {
      const anchorDate = d.startDate ?? d.endDate ?? milestoneDateLookup.get(d.milestoneId) ?? null;
      const positionFromDate = calculatePositionFromDate(anchorDate, projectStartDate, projectEndDate);
      const position = clampPercentage(d.position) ?? positionFromDate ?? idx;
      return {
        id: remap(d.id),
        text: d.label ?? '',
        position,
        milestoneId: d.milestoneId ? milestoneLookup.get(d.milestoneId) ?? null : null,
        status: d.status ?? null,
        owner: d.ownerName ?? null,
        ownerId: d.ownerEmployeeId ?? null,
        description: d.description ?? null,
        notes: d.notes ?? null,
        startDate: d.startDate ?? null,
        endDate: d.endDate ?? null,
        progress: d.progress ?? null,
        checklist: (d.checklist ?? []).map((i, iIdx) => ({
          id: remap(i.id),
          text: i.text ?? '',
          completed: i.completed ?? false,
          position: iIdx,
        })),
      };
    }) ?? [];

  return { phases, milestones, deliverables };
};

const resnapshotReports = async () => {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();
  try {
    const projects = await client.query('SELECT id::text, start_date, end_date FROM projects');
    for (const row of projects.rows) {
      const projectId = row.id;
      const projectMeta = {
        id: projectId,
        startDate: row.start_date ? row.start_date.toISOString().slice(0, 10) : null,
        endDate: row.end_date ? row.end_date.toISOString().slice(0, 10) : null,
      };
      const plan = await listPlanByProject(client, projectId);
      const reports = await getReportsByProjectId(client, projectId);
      for (const report of reports) {
        const planState = buildPlanState(plan, projectMeta); // generate fresh ids per report to avoid PK collisions
        const current = await getReportState(client, report.id);
        const merged = {
          ...current,
          phases: planState.phases,
          milestones: planState.milestones,
          deliverables: planState.deliverables,
        };
        await replaceReportState(client, report.id, merged);
        console.log(`Resnapshotted report ${report.id} for project ${projectId}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
};

resnapshotReports().catch((err) => {
  console.error('Resnapshot failed:', err);
  process.exit(1);
});
