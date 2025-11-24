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
    'report_deliverable_checklist',
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
        if (table === 'report_deliverable_checklist') {
            // Checklist har ikke direkte report_id kolonne; slet via relaterede deliverables for rapporten
            await client.query(
                `DELETE FROM report_deliverable_checklist WHERE deliverable_id IN (
                    SELECT id FROM report_deliverables WHERE report_id = $1${reportIdCast}
                )`,
                [value],
            );
        } else {
            await client.query(`DELETE FROM ${table} WHERE report_id = $1${reportIdCast}`, [value]);
        }
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

export const getReportById = async (client, reportId) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    const result = await client.query(
        {
            text: `SELECT id::text, project_id::text, week_key FROM reports WHERE id = $1::${sqlType} LIMIT 1`,
            values: [value],
        },
    );
    if (result.rowCount === 0) {
        return null;
    }
    const row = result.rows[0];
    return { id: row.id, projectId: row.project_id, weekKey: row.week_key };
};

export const updateReportWeekKey = async (client, reportId, weekKey) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        {
            text: `UPDATE reports SET week_key = $1 WHERE id = $2::${sqlType}`,
            values: [weekKey, value],
        },
    );
};

export const deleteReport = async (client, reportId) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    await client.query(
        {
            text: `DELETE FROM reports WHERE id = $1::${sqlType}`,
            values: [value],
        },
    );
};

export const getReportState = async (client, reportId) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    const reportIdCast = `::${sqlType}`;

    const state = {
        statusItems: [],
        challengeItems: [],
        nextStepItems: [],
        mainTableRows: [],
        risks: [],
        phases: [],
        milestones: [],
        deliverables: [],
        kanbanTasks: [],
        workstreams: [],
    };

    const tables = [
        {
            sql: `SELECT id::text, position, content FROM report_status_items WHERE report_id = $1${reportIdCast}`,
            handler: (row) => state.statusItems.push({ id: row.id, content: row.content }),
        },
        {
            sql: `SELECT id::text, position, content FROM report_challenge_items WHERE report_id = $1${reportIdCast}`,
            handler: (row) => state.challengeItems.push({ id: row.id, content: row.content }),
        },
        {
            sql: `SELECT id::text, position, content FROM report_next_step_items WHERE report_id = $1${reportIdCast}`,
            handler: (row) => state.nextStepItems.push({ id: row.id, content: row.content }),
        },
        {
            sql: `SELECT id::text, position, title, status, note FROM report_main_table_rows WHERE report_id = $1${reportIdCast}`,
            handler: (row) => state.mainTableRows.push({
                id: row.id,
                title: row.title,
                status: row.status,
                note: row.note ?? '',
            }),
        },
    ];

    for (const { sql, handler } of tables) {
        const result = await client.query(sql, [value]);
        result.rows.forEach(handler);
    }

    const snapshotResult = await client.query(
        {
            text: `
                SELECT
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
                FROM report_risk_snapshots s
                LEFT JOIN project_risks pr ON pr.id = s.project_risk_id
                WHERE s.report_id = $1${reportIdCast}
                ORDER BY s.created_at ASC
            `,
            values: [value],
        },
    );

    const snapshotRows = snapshotResult.rows ?? [];
    if (snapshotRows.length > 0) {
        snapshotRows.forEach((row) => {
            state.risks.push({
                id: row.id,
                projectRiskId: row.project_risk_id,
                title: row.title,
                description: row.description ?? null,
                probability: Number(row.probability ?? 1),
                impact: Number(row.impact ?? 1),
                score: Number(row.score ?? 1),
                category: row.category ?? "other",
                status: row.status ?? "open",
                owner: row.owner_name ? { id: row.project_risk_id ?? row.id, name: row.owner_name, email: row.owner_email ?? null } : null,
                mitigationPlanA: row.mitigation_plan_a ?? null,
                mitigationPlanB: row.mitigation_plan_b ?? null,
                followUpNotes: row.follow_up_notes ?? null,
                followUpFrequency: row.follow_up_frequency ?? null,
                dueDate: row.due_date ?? null,
                lastFollowUpAt: row.last_follow_up_at ?? null,
                isArchived: row.project_risk_archived ?? false,
                projectRiskUpdatedAt: row.project_risk_updated_at ?? null,
            });
        });
    } else {
        const legacyRisks = await client.query(
            {
                text: `
                  SELECT id::text, position, name, probability, consequence
                  FROM report_risks
                  WHERE report_id = $1${reportIdCast}
                `,
                values: [value],
            },
        );
        legacyRisks.rows.forEach((row) => {
            const probability = Number(row.probability ?? 1);
            const impact = Number(row.consequence ?? 1);
            state.risks.push({
                id: row.id,
                projectRiskId: null,
                title: row.name ?? '',
                description: null,
                probability,
                impact,
                score: probability * impact,
                category: 'other',
                status: 'open',
                owner: null,
                mitigationPlanA: null,
                mitigationPlanB: null,
                followUpNotes: null,
                followUpFrequency: null,
                dueDate: null,
                lastFollowUpAt: null,
                isArchived: false,
                projectRiskUpdatedAt: null,
            });
        });
    }

    const phasesResult = await client.query(
        {
            text: `
              SELECT id::text, label, start_percentage::float, end_percentage::float, highlight, workstream_id::text, start_date, end_date, status
              FROM report_phases
              WHERE report_id = $1${reportIdCast}
            `,
            values: [value],
        },
    );
    phasesResult.rows.forEach((row) => {
        state.phases.push({
            id: row.id,
            text: row.label,
            start: Number(row.start_percentage ?? 0),
            end: Number(row.end_percentage ?? 0),
            highlight: row.highlight ?? "",
            workstreamId: row.workstream_id ?? null,
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status ?? null,
        });
    });

    const milestonesResult = await client.query(
        {
            text: `
              SELECT id::text, label, position_percentage::float, workstream_id::text, due_date, status
              FROM report_milestones
              WHERE report_id = $1${reportIdCast}
            `,
            values: [value],
        },
    );
    milestonesResult.rows.forEach((row) => {
        state.milestones.push({
            id: row.id,
            text: row.label,
            position: Number(row.position_percentage ?? 0),
            date: row.due_date ?? null,
            status: row.status ?? null,
            workstreamId: row.workstream_id ?? null,
        });
    });

    const deliverablesResult = await client.query(
        {
            text: `
              SELECT
                id::text,
                label,
                position_percentage::float,
                milestone_id::text,
                status,
                owner_name,
                owner_employee_id::text,
                description,
                notes,
                start_date,
                end_date,
                progress
              FROM report_deliverables
              WHERE report_id = $1${reportIdCast}
            `,
            values: [value],
        },
    );
    const deliverableIds = [];
    deliverablesResult.rows.forEach((row) => {
        deliverableIds.push(row.id);
        state.deliverables.push({
            id: row.id,
            text: row.label,
            position: Number(row.position_percentage ?? 0),
            milestoneId: row.milestone_id ?? null,
            status: row.status ?? null,
            owner: row.owner_name ?? null,
            ownerId: row.owner_employee_id ?? null,
            description: row.description ?? null,
            notes: row.notes ?? null,
            startDate: row.start_date ?? null,
            endDate: row.end_date ?? null,
            progress: row.progress ?? null,
            checklist: [],
        });
    });

    if (deliverableIds.length > 0) {
        const checklistResult = await client.query(
            {
                text: `
                  SELECT id::text, deliverable_id::text, position, text, completed
                  FROM report_deliverable_checklist
                  WHERE deliverable_id = ANY($1::uuid[])
                `,
                values: [deliverableIds],
            },
        );
        const checklistByDeliverable = new Map();
        checklistResult.rows.forEach((row) => {
            if (!checklistByDeliverable.has(row.deliverable_id)) {
                checklistByDeliverable.set(row.deliverable_id, []);
            }
            checklistByDeliverable.get(row.deliverable_id).push({
                id: row.id,
                text: row.text,
                completed: row.completed ?? false,
            });
        });
        state.deliverables = state.deliverables.map((d) => ({
            ...d,
            checklist: checklistByDeliverable.get(d.id) ?? [],
        }));
    }

    const kanbanResult = await client.query(
        {
            text: `
              SELECT id::text, content, status, assignee, due_date, notes, created_at
              FROM report_kanban_tasks
              WHERE report_id = $1${reportIdCast}
            `,
            values: [value],
        },
    );
    kanbanResult.rows.forEach((row) => {
        state.kanbanTasks.push({
            id: row.id,
            content: row.content,
            status: row.status,
            assignee: row.assignee ?? null,
            dueDate: row.due_date ?? null,
            notes: row.notes ?? null,
            createdAt: row.created_at ?? new Date().toISOString(),
        });
    });

    return state;
};

export const replaceReportState = async (client, reportId, state) => {
    const { value, sqlType } = classifyReportIdentifier(reportId);
    const reportIdCast = `::${sqlType}`;
    const projectResult = await client.query(
        `SELECT project_id FROM reports WHERE id = $1${reportIdCast} LIMIT 1`,
        [value],
    );
    const projectId = projectResult.rows[0]?.project_id ?? null;
    let allowedWorkstreamIds = new Set();
    if (projectId) {
        const wsResult = await client.query(
            'SELECT id::text FROM project_workstreams WHERE project_id = $1::uuid',
            [projectId],
        );
        allowedWorkstreamIds = new Set(wsResult.rows.map((row) => row.id));
    }

    const resetTables = [
        'report_status_items',
        'report_challenge_items',
        'report_next_step_items',
        'report_main_table_rows',
        'report_phases',
        'report_milestones',
        'report_deliverables',
        'report_kanban_tasks',
        'report_deliverable_checklist',
    ];

    await deleteItems(client, reportId, resetTables);

    const insertListItems = async (items, insertFn) => {
        const seen = new Set();
        for (const [index, item] of (items ?? []).entries()) {
            const itemId = item.id;
            if (!itemId || seen.has(itemId)) continue;
            seen.add(itemId);
            await insertFn(client, reportId, { ...item, position: index });
        }
    };

    await insertListItems(state.statusItems, insertStatusItem);
    await insertListItems(state.challengeItems, insertChallengeItem);
    await insertListItems(state.nextStepItems, insertNextStepItem);
    await insertListItems(state.mainTableRows, insertMainTableRow);

    for (const [index, risk] of (state.risks ?? []).entries()) {
        if (!risk?.id) continue;
        await insertRisk(client, reportId, {
            id: risk.id,
            position: index,
            name: risk.name ?? risk.title ?? "",
            probability: risk.s ?? risk.probability ?? 1,
            consequence: risk.k ?? risk.impact ?? 1,
        });
    }

    for (const phase of state.phases ?? []) {
        if (!phase?.id) continue;
        const sanitizedWorkstreamId =
            phase.workstreamId && allowedWorkstreamIds.has(phase.workstreamId) ? phase.workstreamId : null;
        await insertPhase(client, reportId, {
            id: phase.id,
            label: phase.text ?? "",
            start: phase.start ?? 0,
            end: phase.end ?? 0,
            highlight: phase.highlight ?? "",
            workstreamId: sanitizedWorkstreamId,
            startDate: phase.startDate ?? null,
            endDate: phase.endDate ?? null,
            status: phase.status ?? null,
        });
    }

    for (const milestone of state.milestones ?? []) {
        if (!milestone?.id) continue;
        const sanitizedWorkstreamId =
            milestone.workstreamId && allowedWorkstreamIds.has(milestone.workstreamId) ? milestone.workstreamId : null;
        await insertMilestone(client, reportId, {
            id: milestone.id,
            label: milestone.text ?? "",
            position: milestone.position ?? 0,
            workstreamId: sanitizedWorkstreamId,
            dueDate: milestone.date ?? null,
            status: milestone.status ?? null,
        });
    }

    const deliverableIdSet = new Set();
    for (const deliverable of state.deliverables ?? []) {
        if (!deliverable?.id || deliverableIdSet.has(deliverable.id)) continue;
        deliverableIdSet.add(deliverable.id);
        const resolvedMilestoneId = deliverable.milestoneId ?? null;
        await insertDeliverable(client, reportId, {
            id: deliverable.id,
            label: deliverable.text ?? "",
            position: deliverable.position ?? 0,
            milestoneId: resolvedMilestoneId,
            status: deliverable.status ?? null,
            ownerName: deliverable.owner ?? null,
            ownerId: deliverable.ownerId ?? null,
            description: deliverable.description ?? null,
            notes: deliverable.notes ?? null,
            startDate: deliverable.startDate ?? null,
            endDate: deliverable.endDate ?? null,
            progress: deliverable.progress ?? null,
        });
        for (const [idx, checklistItem] of (deliverable.checklist ?? []).entries()) {
            if (!checklistItem?.id) continue;
            await insertDeliverableChecklistItem(client, {
                id: checklistItem.id,
                deliverableId: deliverable.id,
                position: idx,
                text: checklistItem.text ?? "",
                completed: checklistItem.completed ?? false,
            });
        }
    }

    for (const task of state.kanbanTasks ?? []) {
        if (!task?.id) continue;
        await insertKanbanTask(client, reportId, {
            id: task.id,
            content: task.content ?? "",
            status: task.status ?? "todo",
            assignee: task.assignee ?? null,
            dueDate: task.dueDate ?? null,
            notes: task.notes ?? null,
            createdAt: task.createdAt ?? new Date().toISOString(),
        });
    }
};
