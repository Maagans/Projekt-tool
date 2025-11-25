import { toDateOnly, ensureUuid } from '../utils/helpers.js';

const clampPercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(100, Math.max(0, num));
};

export const listPlanByProject = async (client, projectId) => {
  const phasesResult = await client.query(
    `
    SELECT
      id::text,
      project_id::text AS project_id,
      workstream_id::text AS workstream_id,
      label,
      start_date,
      end_date,
      start_percentage::float,
      end_percentage::float,
      highlight,
      status,
      sort_order
    FROM project_phases
    WHERE project_id = $1::uuid
    ORDER BY sort_order ASC, start_date NULLS FIRST, id::uuid
  `,
    [projectId],
  );

  const milestonesResult = await client.query(
    `
    SELECT
      id::text,
      project_id::text AS project_id,
      workstream_id::text AS workstream_id,
      label,
      due_date,
      position_percentage::float,
      status
    FROM project_milestones
    WHERE project_id = $1::uuid
    ORDER BY due_date NULLS FIRST, position_percentage NULLS FIRST, id::uuid
  `,
    [projectId],
  );

  const deliverablesResult = await client.query(
    `
    SELECT
      d.id::text,
      d.project_id::text AS project_id,
      d.milestone_id::text AS milestone_id,
      d.label,
      d.position_percentage::float,
      d.status,
      d.owner_name,
      d.owner_employee_id::text AS owner_employee_id,
      d.description,
      d.notes,
      d.start_date,
      d.end_date,
      d.progress::float
    FROM project_deliverables d
    WHERE d.project_id = $1::uuid
    ORDER BY d.position_percentage NULLS FIRST, d.id::uuid
  `,
    [projectId],
  );

  const deliverableIds = deliverablesResult.rows.map((row) => row.id);
  let checklist = [];
  if (deliverableIds.length > 0) {
    const checklistResult = await client.query(
      `
      SELECT
        id::text,
        deliverable_id::text,
        position,
        text,
        completed
      FROM project_deliverable_checklist
      WHERE deliverable_id = ANY($1::uuid[])
      ORDER BY deliverable_id::uuid, position ASC, id::uuid
    `,
      [deliverableIds],
    );
    checklist = checklistResult.rows;
  }

  const checklistByDeliverable = new Map();
  for (const item of checklist) {
    if (!checklistByDeliverable.has(item.deliverable_id)) {
      checklistByDeliverable.set(item.deliverable_id, []);
    }
    checklistByDeliverable.get(item.deliverable_id).push({
      id: item.id,
      text: item.text,
      completed: item.completed ?? false,
    });
  }

  const deliverables = deliverablesResult.rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    milestoneId: row.milestone_id ?? null,
    label: row.label,
    position: row.position_percentage ?? null,
    status: row.status ?? null,
    ownerName: row.owner_name ?? null,
    ownerEmployeeId: row.owner_employee_id ?? null,
    description: row.description ?? null,
    notes: row.notes ?? null,
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date),
    progress: row.progress ?? null,
    checklist: checklistByDeliverable.get(row.id) ?? [],
  }));

  const milestones = milestonesResult.rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    workstreamId: row.workstream_id ?? null,
    label: row.label,
    position: row.position_percentage ?? null,
    dueDate: toDateOnly(row.due_date),
    status: row.status ?? null,
  }));

  const phases = phasesResult.rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    workstreamId: row.workstream_id ?? null,
    label: row.label,
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date),
    startPercentage: row.start_percentage ?? null,
    endPercentage: row.end_percentage ?? null,
    highlight: row.highlight ?? null,
    status: row.status ?? null,
    sortOrder: row.sort_order ?? 0,
  }));

  return { phases, milestones, deliverables };
};

export const upsertPhase = async (client, phase) => {
  const id = ensureUuid(phase.id);
  const startPct = clampPercent(phase.startPercentage);
  const endPct = clampPercent(phase.endPercentage);
  await client.query(
    `
    INSERT INTO project_phases (id, project_id, workstream_id, label, start_date, end_date, start_percentage, end_percentage, highlight, status, sort_order)
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::date, $6::date, $7, $8, $9, $10, $11)
    ON CONFLICT (id)
    DO UPDATE SET
      project_id = EXCLUDED.project_id,
      workstream_id = EXCLUDED.workstream_id,
      label = EXCLUDED.label,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      start_percentage = EXCLUDED.start_percentage,
      end_percentage = EXCLUDED.end_percentage,
      highlight = EXCLUDED.highlight,
      status = EXCLUDED.status,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
  `,
    [
      id,
      phase.projectId,
      phase.workstreamId ?? null,
      phase.label ?? '',
      toDateOnly(phase.startDate),
      toDateOnly(phase.endDate),
      startPct,
      endPct,
      phase.highlight ?? null,
      phase.status ?? null,
      typeof phase.sortOrder === 'number' ? phase.sortOrder : 0,
    ],
  );
  return id;
};

export const deletePhasesNotIn = async (client, projectId, keepIds = []) => {
  const ids = keepIds.map((id) => ensureUuid(id));
  await client.query(
    `
    DELETE FROM project_phases
    WHERE project_id = $1::uuid
      AND ($2::uuid[] IS NULL OR id NOT IN (SELECT UNNEST($2::uuid[])))
  `,
    [projectId, ids.length ? ids : null],
  );
};

export const upsertMilestone = async (client, milestone) => {
  const id = ensureUuid(milestone.id);
  const position = clampPercent(milestone.position);
  await client.query(
    `
    INSERT INTO project_milestones (id, project_id, workstream_id, label, due_date, position_percentage, status)
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::date, $6, $7)
    ON CONFLICT (id)
    DO UPDATE SET
      project_id = EXCLUDED.project_id,
      workstream_id = EXCLUDED.workstream_id,
      label = EXCLUDED.label,
      due_date = EXCLUDED.due_date,
      position_percentage = EXCLUDED.position_percentage,
      status = EXCLUDED.status,
      updated_at = NOW()
  `,
    [
      id,
      milestone.projectId,
      milestone.workstreamId ?? null,
      milestone.label ?? '',
      toDateOnly(milestone.dueDate),
      position,
      milestone.status ?? null,
    ],
  );
  return id;
};

export const deleteMilestonesNotIn = async (client, projectId, keepIds = []) => {
  const ids = keepIds.map((id) => ensureUuid(id));
  await client.query(
    `
    DELETE FROM project_milestones
    WHERE project_id = $1::uuid
      AND ($2::uuid[] IS NULL OR id NOT IN (SELECT UNNEST($2::uuid[])))
  `,
    [projectId, ids.length ? ids : null],
  );
};

export const upsertDeliverable = async (client, deliverable) => {
  const id = ensureUuid(deliverable.id);
  const position = clampPercent(deliverable.position);
  const progress = typeof deliverable.progress === 'number' ? clampPercent(deliverable.progress) : null;
  await client.query(
    `
    INSERT INTO project_deliverables (
      id, project_id, milestone_id, label, position_percentage, status,
      owner_name, owner_employee_id, description, notes, start_date, end_date, progress
    )
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8::uuid, $9, $10, $11::date, $12::date, $13)
    ON CONFLICT (id)
    DO UPDATE SET
      project_id = EXCLUDED.project_id,
      milestone_id = EXCLUDED.milestone_id,
      label = EXCLUDED.label,
      position_percentage = EXCLUDED.position_percentage,
      status = EXCLUDED.status,
      owner_name = EXCLUDED.owner_name,
      owner_employee_id = EXCLUDED.owner_employee_id,
      description = EXCLUDED.description,
      notes = EXCLUDED.notes,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      progress = EXCLUDED.progress,
      updated_at = NOW()
  `,
    [
      id,
      deliverable.projectId,
      deliverable.milestoneId ?? null,
      deliverable.label ?? '',
      position,
      deliverable.status ?? null,
      deliverable.ownerName ?? null,
      deliverable.ownerEmployeeId ?? null,
      deliverable.description ?? null,
      deliverable.notes ?? null,
      toDateOnly(deliverable.startDate),
      toDateOnly(deliverable.endDate),
      progress,
    ],
  );
  return id;
};

export const deleteDeliverablesNotIn = async (client, projectId, keepIds = []) => {
  const ids = keepIds.map((id) => ensureUuid(id));
  await client.query(
    `
    DELETE FROM project_deliverables
    WHERE project_id = $1::uuid
      AND ($2::uuid[] IS NULL OR id NOT IN (SELECT UNNEST($2::uuid[])))
  `,
    [projectId, ids.length ? ids : null],
  );
};

export const replaceChecklistForDeliverable = async (client, deliverableId, items = []) => {
  await client.query(`DELETE FROM project_deliverable_checklist WHERE deliverable_id = $1::uuid`, [deliverableId]);
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item) continue;
    await client.query(
      `
      INSERT INTO project_deliverable_checklist (id, deliverable_id, position, text, completed)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5)
    `,
      [
        ensureUuid(item.id),
        deliverableId,
        typeof item.position === 'number' ? item.position : index,
        item.text ?? '',
        item.completed === true,
      ],
    );
  }
};
