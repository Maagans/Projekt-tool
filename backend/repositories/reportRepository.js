import { classifyReportIdentifier } from '../utils/helpers.js';

const REPORT_ITEM_TABLES = [
    'report_status_items',
    'report_challenge_items',
    'report_next_step_items',
    'report_main_table_rows',
    'report_phases',
    'report_milestones',
    'report_deliverables',
    'report_kanban_tasks',
    'report_risks',
];

export const getReportsByProjectId = async (client, projectId) => {
    const result = await client.query(
        'SELECT id::text, week_key FROM reports WHERE project_id = $1::uuid',
        [projectId]
    );
    return result.rows.map(row => ({
        id: row.id,
        weekKey: row.week_key
    }));
};

export const createReport = async (client, projectId, weekKey) => {
    const result = await client.query(
        'INSERT INTO reports (project_id, week_key) VALUES ($1::uuid, $2) RETURNING id::text',
        [projectId, weekKey]
    );
    return result.rows[0].id;
};

export const deleteReports = async (client, projectId, reportIds) => {
    if (!reportIds || reportIds.length === 0) return;

    const deleteBuckets = reportIds.reduce((buckets, rawId) => {
        const { value, sqlType } = classifyReportIdentifier(rawId);
        buckets[sqlType].push(value);
        return buckets;
    }, { uuid: [], bigint: [] });

    if (deleteBuckets.bigint.length > 0) {
        await client.query(
            'DELETE FROM reports WHERE project_id = $1::uuid AND id IN (SELECT value::bigint FROM unnest($2::text[]) AS value)',
            [projectId, deleteBuckets.bigint],
        );
    }

    if (deleteBuckets.uuid.length > 0) {
        await client.query(
            'DELETE FROM reports WHERE project_id = $1::uuid AND id IN (SELECT value::uuid FROM unnest($2::text[]) AS value)',
            [projectId, deleteBuckets.uuid],
        );
    }
};

export const deleteItems = async (client, reportId, tableNames) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    const reportIdCast = `::${sqlType}`;

    for (const table of tableNames) {
        if (!REPORT_ITEM_TABLES.includes(table)) {
            throw new Error(`Invalid table name for report items: ${table}`);
        }
        await client.query(`DELETE FROM ${table} WHERE report_id = $1${reportIdCast}`, [value]);
    }
};

export const insertStatusItem = async (client, reportId, { id, position, content }) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        `INSERT INTO report_status_items (id, report_id, position, content)
         VALUES ($1::uuid, $2::${sqlType}, $3, $4)`,
        [id, value, position, content]
    );
};

export const insertChallengeItem = async (client, reportId, { id, position, content }) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        `INSERT INTO report_challenge_items (id, report_id, position, content)
         VALUES ($1::uuid, $2::${sqlType}, $3, $4)`,
        [id, value, position, content]
    );
};

export const insertNextStepItem = async (client, reportId, { id, position, content }) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        `INSERT INTO report_next_step_items (id, report_id, position, content)
         VALUES ($1::uuid, $2::${sqlType}, $3, $4)`,
        [id, value, position, content]
    );
};

export const insertMainTableRow = async (client, reportId, { id, position, title, status, note }) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        `INSERT INTO report_main_table_rows (id, report_id, position, title, status, note)
         VALUES ($1::uuid, $2::${sqlType}, $3, $4, $5, $6)`,
        [id, value, position, title, status, note]
    );
};

export const insertRisk = async (client, reportId, { id, position, name, probability, consequence }) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        `INSERT INTO report_risks (id, report_id, position, name, probability, consequence)
         VALUES ($1::uuid, $2::${sqlType}, $3, $4, $5, $6)`,
        [id, value, position, name, probability, consequence]
    );
};

export const insertPhase = async (client, reportId, { id, label, start, end, highlight, workstreamId, startDate, endDate, status }) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        `INSERT INTO report_phases (id, report_id, label, start_percentage, end_percentage, highlight, workstream_id, start_date, end_date, status)
         VALUES ($1::uuid, $2::${sqlType}, $3, $4, $5, $6, $7::uuid, $8::date, $9::date, $10)`,
        [id, value, label, start, end, highlight, workstreamId, startDate, endDate, status]
    );
};

export const insertMilestone = async (client, reportId, { id, label, position, workstreamId, dueDate, status }) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        `INSERT INTO report_milestones (id, report_id, label, position_percentage, workstream_id, due_date, status)
         VALUES ($1::uuid, $2::${sqlType}, $3, $4, $5::uuid, $6::date, $7)`,
        [id, value, label, position, workstreamId, dueDate, status]
    );
};

export const insertDeliverable = async (client, reportId, { id, label, position, milestoneId, status, ownerName, ownerId, description, notes, startDate, endDate, progress }) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        `INSERT INTO report_deliverables (id, report_id, label, position_percentage, milestone_id, status, owner_name, owner_employee_id, description, notes, start_date, end_date, progress)
         VALUES ($1::uuid, $2::${sqlType}, $3, $4, $5::uuid, $6, $7, $8::uuid, $9, $10, $11::date, $12::date, $13)`,
        [id, value, label, position, milestoneId, status, ownerName, ownerId, description, notes, startDate, endDate, progress]
    );
};

export const insertDeliverableChecklistItem = async (client, { id, deliverableId, position, text, completed }) => {
    await client.query(
        `INSERT INTO report_deliverable_checklist (id, deliverable_id, position, text, completed)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5)`,
        [id, deliverableId, position, text, completed]
    );
};

export const insertKanbanTask = async (client, reportId, { id, content, status, assignee, dueDate, notes, createdAt }) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        `INSERT INTO report_kanban_tasks (id, report_id, content, status, assignee, due_date, notes, created_at)
         VALUES ($1::uuid, $2::${sqlType}, $3, $4, $5, $6::date, $7, $8::timestamptz)`,
        [id, value, content, status, assignee, dueDate, notes, createdAt]
    );
};
