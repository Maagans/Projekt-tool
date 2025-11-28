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

const buildPlanState = (plan) => {
  const idMap = new Map();
  const remap = (id) => {
    if (!id) return randomUUID();
    if (!idMap.has(id)) idMap.set(id, randomUUID());
    return idMap.get(id);
  };

  const phases =
    plan.phases?.map((p) => ({
      id: remap(p.id),
      text: p.label ?? '',
      start: p.startPercentage ?? 0,
      end: p.endPercentage ?? 0,
      highlight: p.highlight ?? '',
      workstreamId: p.workstreamId ?? null,
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
      status: p.status ?? null,
    })) ?? [];

  const milestones =
    plan.milestones?.map((m, idx) => ({
      id: remap(m.id),
      text: m.label ?? '',
      position: m.position ?? idx,
      workstreamId: m.workstreamId ?? null,
      date: m.dueDate ?? null,
      status: m.status ?? null,
    })) ?? [];

  const milestoneLookup = new Map();
  plan.milestones?.forEach((m) => milestoneLookup.set(m.id, remap(m.id)));

  const deliverables =
    plan.deliverables?.map((d, idx) => ({
      id: remap(d.id),
      text: d.label ?? '',
      position: d.position ?? idx,
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
    })) ?? [];

  return { phases, milestones, deliverables };
};

const resnapshotReports = async () => {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();
  try {
    const projects = await client.query('SELECT id::text FROM projects');
    for (const row of projects.rows) {
      const projectId = row.id;
      const plan = await listPlanByProject(client, projectId);
      const reports = await getReportsByProjectId(client, projectId);
      for (const report of reports) {
        const planState = buildPlanState(plan); // generate fresh IDs per report to avoid PK collisions
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
