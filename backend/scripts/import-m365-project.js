import { randomUUID } from 'crypto';
import pool from '../db.js';

const projectData = {
  name: 'M365 Cloud Migration',
  department: 'IT & Digitalisering',
  status: 'active', // mapped from ON_TRACK -> active
  manager: 'Christian Scheelhardt',
  description: 'Konsolidering af infrastruktur på Microsoft 365 og Azure, samt udfasning af on-prem servere.',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  risks: [
    { title: 'Skjulte tekniske afhængigheder', probability: 4, impact: 5, owner: 'Christian Scheelhardt', mitigation: 'Grundig foranalyse med Azure Migrate dependency analysis i Fase 1.' },
    { title: 'Modstand mod forandring', probability: 3, impact: 4, owner: 'Kim Christoffersen', mitigation: 'Involverende kommunikationsplan og aktiv brug af Champions-programmet.' },
  ],
  workstreams: [
    { id: 'ws-gov', name: 'Ledelse & Governance' },
    { id: 'ws-inf', name: 'Infrastruktur & Azure' },
    { id: 'ws-mw', name: 'Modern Workplace (Intune)' },
    { id: 'ws-adop', name: 'Adoption & Udrulning' },
  ],
  phases: [
    { id: 'ph-0', name: 'Fase 0: Forberedelse', startDate: '2026-01-01', endDate: '2026-01-31', status: 'Completed', color: 'planned' },
    { id: 'ph-1', name: 'Fase 1: Foranalyse', startDate: '2026-02-01', endDate: '2026-03-31', status: 'Active', color: 'active' },
    { id: 'ph-2', name: 'Fase 2: Teknisk Pilot', startDate: '2026-04-01', endDate: '2026-05-15', status: 'Planned', color: 'planned' },
    { id: 'ph-3', name: 'Fase 3: Klargøring', startDate: '2026-05-16', endDate: '2026-06-30', status: 'Planned', color: 'planned' },
    { id: 'ph-4', name: 'Fase 4: Udrulning', startDate: '2026-08-01', endDate: '2026-10-31', status: 'Planned', color: 'planned' },
    { id: 'ph-5', name: 'Fase 5: Cloud Drift', startDate: '2026-11-01', endDate: '2026-12-31', status: 'Planned', color: 'planned' },
  ],
  milestones: [
    {
      id: 'm1',
      title: 'M1: Godkendt Foranalyse',
      date: '2026-03-31',
      status: 'Pending',
      workstream: 'Ledelse & Governance',
      deliverables: [
        { id: 'd1-1', title: 'Indgået CSP/MSPA aftale', status: 'Completed', startDate: '2026-01-05', endDate: '2026-01-25', owner: 'Kim Christoffersen' },
        { id: 'd1-2', title: 'Licens- og kapacitetsvurdering', status: 'In Progress', startDate: '2026-02-01', endDate: '2026-02-20', owner: 'Ricki Berthelsen' },
        { id: 'd1-3', title: '6R Workload Analyse & Digital Estate', status: 'Pending', startDate: '2026-02-15', endDate: '2026-03-15', owner: 'Ricki Berthelsen' },
      ],
    },
    {
      id: 'm2',
      title: 'M2: Teknisk Pilot & LZ',
      date: '2026-05-15',
      status: 'Pending',
      workstream: 'Infrastruktur & Azure',
      deliverables: [
        { id: 'd2-1', title: 'Azure Landing Zone Setup', status: 'Pending', startDate: '2026-04-01', endDate: '2026-04-30', owner: 'Ricki Berthelsen' },
        { id: 'd2-2', title: 'Identitetsstyring & Sikkerhed', status: 'Pending', startDate: '2026-04-15', endDate: '2026-05-01', owner: 'Stephan Ancher' },
        { id: 'd2-3', title: 'Teknisk Pilot i IT-afd.', status: 'Pending', startDate: '2026-05-01', endDate: '2026-05-15', owner: 'Benjamin Elechi' },
      ],
    },
    {
      id: 'm3',
      title: 'M3: Platform Klar',
      date: '2026-06-30',
      status: 'Pending',
      workstream: 'Modern Workplace (Intune)',
      deliverables: [
        { id: 'd3-1', title: 'Intune & Autopilot Konfiguration', status: 'Pending', startDate: '2026-05-16', endDate: '2026-06-15', owner: 'Jim Sønderlev' },
        { id: 'd3-2', title: 'Applikationspakker (Software)', status: 'Pending', startDate: '2026-05-20', endDate: '2026-06-20', owner: 'Jim Sønderlev' },
        { id: 'd3-3', title: 'Udarbejdelse af træningsmateriale', status: 'Pending', startDate: '2026-06-01', endDate: '2026-06-30', owner: 'Christian Scheelhardt' },
      ],
    },
    {
      id: 'm4',
      title: 'M4: Alle Migreret',
      date: '2026-10-31',
      status: 'Pending',
      workstream: 'Adoption & Udrulning',
      deliverables: [
        { id: 'd4-1', title: 'Migrering: Sekretariatet', status: 'Pending', startDate: '2026-08-01', endDate: '2026-08-31', owner: 'Benjamin Elechi' },
        { id: 'd4-2', title: 'Migrering: Dansk Gigthospital', status: 'Pending', startDate: '2026-09-01', endDate: '2026-09-30', owner: 'Benjamin Elechi' },
        { id: 'd4-3', title: 'Migrering: Sano Centrene', status: 'Pending', startDate: '2026-10-01', endDate: '2026-10-31', owner: 'Benjamin Elechi' },
      ],
    },
    {
      id: 'm5',
      title: 'M5: On-prem Server Migrering',
      date: '2026-12-31',
      status: 'Pending',
      workstream: 'Infrastruktur & Azure',
      deliverables: [
        { id: 'd5-1', title: 'Afvikling af legacy servere', status: 'Pending', startDate: '2026-11-01', endDate: '2026-12-15', owner: 'Stephan Ancher' },
        { id: 'd5-2', title: 'Nedlukning af on-prem datacenter', status: 'Pending', startDate: '2026-12-15', endDate: '2026-12-31', owner: 'Kim Christoffersen' },
      ],
    },
  ],
};

const percentFromDate = (dateStr, startStr, endStr) => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const target = new Date(dateStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(target.getTime()) || end <= start) {
    return null;
  }
  const ratio = (target.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return Math.max(0, Math.min(100, ratio * 100));
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop existing project with same name if it exists
    const existing = await client.query(`SELECT id::text FROM projects WHERE name = $1 LIMIT 1`, [projectData.name]);
    let projectId = existing.rows[0]?.id ?? null;
    if (projectId) {
      await client.query(`DELETE FROM project_deliverables WHERE project_id = $1::uuid`, [projectId]);
      await client.query(`DELETE FROM project_milestones WHERE project_id = $1::uuid`, [projectId]);
      await client.query(`DELETE FROM project_phases WHERE project_id = $1::uuid`, [projectId]);
      await client.query(`DELETE FROM project_workstreams WHERE project_id = $1::uuid`, [projectId]);
      await client.query(`DELETE FROM projects WHERE id = $1::uuid`, [projectId]);
      projectId = null;
    }

    projectId = projectId ?? randomUUID();

    await client.query(
      `
        INSERT INTO projects (id, name, start_date, end_date, status, description, project_goal, business_case, total_budget, hero_image_url)
        VALUES ($1::uuid, $2, $3::date, $4::date, $5, $6, '', '', NULL, NULL)
      `,
      [projectId, projectData.name, projectData.startDate, projectData.endDate, projectData.status ?? 'active', projectData.description ?? ''],
    );

    // Workstreams
    const workstreamIdByName = new Map();
    for (const [index, stream] of projectData.workstreams.entries()) {
      const wsId = randomUUID();
      workstreamIdByName.set(stream.name, wsId);
      await client.query(
        `INSERT INTO project_workstreams (id, project_id, name, sort_order) VALUES ($1::uuid, $2::uuid, $3, $4)`,
        [wsId, projectId, stream.name, index],
      );
    }

    // Phases
    for (const [index, phase] of projectData.phases.entries()) {
      const startPct = percentFromDate(phase.startDate, projectData.startDate, projectData.endDate);
      const endPct = percentFromDate(phase.endDate ?? phase.startDate, projectData.startDate, projectData.endDate);
      await client.query(
        `
          INSERT INTO project_phases (id, project_id, workstream_id, label, start_date, end_date, start_percentage, end_percentage, highlight, status, sort_order)
          VALUES ($1::uuid, $2::uuid, NULL, $3, $4::date, $5::date, $6, $7, $8, $9, $10)
        `,
        [
          randomUUID(),
          projectId,
          phase.name,
          phase.startDate,
          phase.endDate,
          startPct,
          endPct,
          phase.color ?? null,
          phase.status ?? null,
          index,
        ],
      );
    }

    // Milestones + deliverables
    for (const milestone of projectData.milestones) {
      const msId = randomUUID();
      const pos = percentFromDate(milestone.date, projectData.startDate, projectData.endDate);
      const workstreamId = milestone.workstream ? workstreamIdByName.get(milestone.workstream) ?? null : null;
      await client.query(
        `
          INSERT INTO project_milestones (id, project_id, workstream_id, label, due_date, position_percentage, status)
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::date, $6, $7)
        `,
        [msId, projectId, workstreamId, milestone.title, milestone.date, pos, milestone.status ?? null],
      );

      for (const [dIndex, deliverable] of (milestone.deliverables ?? []).entries()) {
        const position = percentFromDate(deliverable.startDate ?? deliverable.endDate ?? milestone.date, projectData.startDate, projectData.endDate);
        await client.query(
          `
            INSERT INTO project_deliverables (
              id, project_id, milestone_id, label, position_percentage, status,
              owner_name, owner_employee_id, description, notes, start_date, end_date, progress
            )
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, NULL, NULL, NULL, $8::date, $9::date, NULL)
          `,
          [
            randomUUID(),
            projectId,
            msId,
            deliverable.title,
            position ?? dIndex,
            deliverable.status ?? null,
            deliverable.owner ?? null,
            deliverable.startDate ?? null,
            deliverable.endDate ?? null,
          ],
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Project inserted with id ${projectId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import failed', error);
  } finally {
    pool.end();
  }
};

main().catch((err) => {
  console.error(err);
  pool.end();
});
