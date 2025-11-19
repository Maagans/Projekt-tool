import { config } from '../config/index.js';
import pool from '../db.js';
import logger from '../logger.js';
import { normalizeEmail, ensureUuid, isValidUuid, toDateOnly, toNonNegativeCapacity, classifyReportIdentifier } from '../utils/helpers.js';

export const WORKSPACE_SETTINGS_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

const logDebug = (category, ...args) => {
    if (config.debug.workspace === true) {
        logger.debug({ category, args });
    }
};

const normalizeMirrorValue = (value) => {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const PHASE_STATUS_OPTIONS = new Set(['Planned', 'Active', 'Completed']);
const MILESTONE_STATUS_OPTIONS = new Set(['Pending', 'On Track', 'Delayed', 'Completed']);
const DELIVERABLE_STATUS_OPTIONS = new Set(['Pending', 'In Progress', 'Completed']);

const cloneWorkstreamsForState = (streams = []) => (
    Array.isArray(streams)
        ? streams
        : []
).map((stream, index) => ({
    id: stream?.id ?? ensureUuid(),
    name: stream?.name ?? `Workstream ${index + 1}`,
    order: typeof stream?.order === 'number' ? stream.order : index,
}));

export const resolveDepartmentLocation = (source = {}, fallback = {}) => {
    const normalizedLocation = normalizeMirrorValue(source.location);
    const normalizedDepartment = normalizeMirrorValue(source.department);
    const fallbackLocation = normalizeMirrorValue(fallback.location);
    const fallbackDepartment = normalizeMirrorValue(fallback.department);

    const canonical =
        normalizedLocation ?? normalizedDepartment ?? fallbackLocation ?? fallbackDepartment ?? null;

    return {
        canonical,
        location: canonical ?? '',
        department: canonical,
    };
};
export const loadFullWorkspace = async (clientOverride) => {
    const executor = clientOverride ?? pool;

    const settingsResult = await executor.query(
        `
        SELECT COALESCE(pmo_baseline_hours_week, 0)::float AS baseline
        FROM workspace_settings
        WHERE id = $1::uuid
        LIMIT 1
    `,
        [WORKSPACE_SETTINGS_SINGLETON_ID],
    );
    const baselineRow = settingsResult.rows?.[0] ?? null;
    const settings = {
        pmoBaselineHoursWeek: toNonNegativeCapacity(baselineRow?.baseline ?? 0),
    };

    const employeesResult = await executor.query(`
        SELECT
            id::text,
            name,
            email,
            COALESCE(location, '') AS location,
            COALESCE(max_capacity_hours_week, 0)::float AS max_capacity_hours_week,
            azure_ad_id,
            department,
            job_title,
            account_enabled,
            synced_at
        FROM employees
        ORDER BY name ASC
    `);

    const employees = employeesResult.rows.map((row) => {
        const mirrored = resolveDepartmentLocation(row);
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            location: mirrored.location,
            maxCapacityHoursWeek: Number(row.max_capacity_hours_week ?? 0),
            azureAdId: row.azure_ad_id ?? null,
            department: mirrored.department,
            jobTitle: row.job_title ?? null,
            accountEnabled: row.account_enabled ?? true,
            syncedAt: row.synced_at ? new Date(row.synced_at).toISOString() : null,
        };
    });

    const projectsResult = await executor.query(`
        SELECT id::text, name, start_date, end_date, status, description, project_goal, business_case, total_budget, hero_image_url
        FROM projects
        ORDER BY created_at ASC
    `);

    const projects = projectsResult.rows.map((row) => ({
        id: row.id,
        config: {
            projectName: row.name,
            projectStartDate: toDateOnly(row.start_date) ?? toDateOnly(new Date()),
            projectEndDate: toDateOnly(row.end_date) ?? toDateOnly(new Date()),
            projectGoal: row.project_goal ?? '',
            businessCase: row.business_case ?? '',
            totalBudget: row.total_budget !== null ? Number(row.total_budget) : null,
            heroImageUrl: row.hero_image_url ?? null,
        },
        status: row.status,
        description: row.description ?? '',
        projectMembers: [],
        reports: [],
        workstreams: [],
    }));

    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const projectIds = projects.map((project) => project.id);

    if (projectIds.length > 0) {
        const workstreamsResult = await executor.query(
            `
            SELECT id::text, project_id::text, name, sort_order::int
            FROM project_workstreams
            WHERE project_id = ANY($1::uuid[])
            ORDER BY sort_order ASC, name ASC
        `,
            [projectIds],
        );

        workstreamsResult.rows.forEach((row) => {
            const project = projectMap.get(row.project_id);
            if (!project) {
                return;
            }
            if (!Array.isArray(project.workstreams)) {
                project.workstreams = [];
            }
            project.workstreams.push({
                id: row.id,
                name: row.name,
                order: Number(row.sort_order ?? project.workstreams.length),
            });
        });

        projects.forEach((project) => {
            project.workstreams = (project.workstreams ?? [])
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((stream, index) => ({ ...stream, order: index }));
        });
    }

    const memberMap = new Map();
    if (projectIds.length > 0) {
        const membersResult = await executor.query(`
            SELECT id::text, project_id::text, employee_id::text, role, member_group, is_project_lead
            FROM project_members
            WHERE project_id = ANY($1::uuid[])
            ORDER BY member_group, role, id::uuid
        `, [projectIds]);

        for (const row of membersResult.rows) {
            const member = {
                id: row.id,
                employeeId: row.employee_id,
                role: row.role,
                group: row.member_group,
                isProjectLead: row.is_project_lead,
                timeEntries: [],
            };
            memberMap.set(row.id, member);
            const project = projectMap.get(row.project_id);
            if (project) {
                project.projectMembers.push(member);
            }
        }
    }

    if (memberMap.size > 0) {
        const memberIds = Array.from(memberMap.keys());
        const entriesResult = await executor.query(`
            SELECT project_member_id::text AS member_id, week_key, planned_hours::float, actual_hours::float
            FROM project_member_time_entries
            WHERE project_member_id = ANY($1::uuid[])
        `, [memberIds]);

        for (const row of entriesResult.rows) {
            const member = memberMap.get(row.member_id);
            if (!member) continue;
            member.timeEntries.push({
                weekKey: row.week_key,
                plannedHours: Number(row.planned_hours ?? 0),
                actualHours: Number(row.actual_hours ?? 0),
            });
        }

        memberMap.forEach((member) => {
            member.timeEntries.sort((a, b) => a.weekKey.localeCompare(b.weekKey));
        });
    }

    const reportMap = new Map();
    if (projectIds.length > 0) {
        const reportsResult = await executor.query(`
            SELECT id::text, project_id::text, week_key
            FROM reports
            WHERE project_id = ANY($1::uuid[])
            ORDER BY week_key DESC
        `, [projectIds]);

        for (const row of reportsResult.rows) {
            const project = projectMap.get(row.project_id);
            const report = {
                id: row.id,
                weekKey: row.week_key,
                state: {
                    statusItems: [],
                    challengeItems: [],
                    nextStepItems: [],
                    mainTableRows: [],
                    risks: [],
                    phases: [],
                    milestones: [],
                    deliverables: [],
                    kanbanTasks: [],
                    workstreams: cloneWorkstreamsForState(project?.workstreams ?? []),
                },
            };
            reportMap.set(row.id, report);
            if (project) {
                project.reports.push(report);
            }
        }
    }

    const reportIds = Array.from(reportMap.keys());
    if (reportIds.length > 0) {
        const fetchReportItems = async (query) => {
            const result = await executor.query(query, [reportIds]);
            return result.rows;
        };

        const statusItems = await fetchReportItems(`
            SELECT id::text, report_id::text, position, content
            FROM report_status_items
            WHERE report_id::text = ANY($1::text[])
            ORDER BY position ASC, id::uuid ASC
        `);
        statusItems.forEach((row) => {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.statusItems.push({ id: row.id, content: row.content });
            }
        });
        const challengeItems = await fetchReportItems(`
            SELECT id::text, report_id::text, position, content
            FROM report_challenge_items
            WHERE report_id::text = ANY($1::text[])
            ORDER BY position ASC, id::uuid ASC
        `);
        challengeItems.forEach((row) => {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.challengeItems.push({ id: row.id, content: row.content });
            }
        });
        const nextStepItems = await fetchReportItems(`
            SELECT id::text, report_id::text, position, content
            FROM report_next_step_items
            WHERE report_id::text = ANY($1::text[])
            ORDER BY position ASC, id::uuid ASC
        `);
        nextStepItems.forEach((row) => {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.nextStepItems.push({ id: row.id, content: row.content });
            }
        });

        const mainRows = await fetchReportItems(`
            SELECT id::text, report_id::text, position, title, status, note
            FROM report_main_table_rows
            WHERE report_id::text = ANY($1::text[])
            ORDER BY position ASC, id::uuid ASC
        `);
        mainRows.forEach((row) => {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.mainTableRows.push({
                    id: row.id,
                    title: row.title,
                    status: row.status,
                    note: row.note ?? '',
                });
            }
        });

        const toIsoString = (value) => {
            if (!value) return null;
            if (typeof value === 'string') {
                return value;
            }
            try {
                return value.toISOString();
            } catch (error) {
                return String(value);
            }
        };

        const snapshotRows = await fetchReportItems(`
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
                pr.is_archived AS project_risk_archived,
                pr.updated_at AS project_risk_updated_at
            FROM report_risk_snapshots s
            LEFT JOIN project_risks pr ON pr.id = s.project_risk_id
            WHERE s.report_id::text = ANY($1::text[])
            ORDER BY s.created_at ASC
        `);

        const snapshotReportIds = new Set();
        snapshotRows.forEach((row) => {
            const report = reportMap.get(row.report_id);
            if (report) {
                snapshotReportIds.add(row.report_id);
                report.state.risks.push({
                    id: row.id,
                    name: row.title,
                    s: Number(row.probability ?? 1),
                    k: Number(row.impact ?? 1),
                    projectRiskId: row.project_risk_id ?? null,
                    description: row.description ?? null,
                    status: row.status ?? 'open',
                    categoryKey: row.category ?? 'other',
                    ownerName: row.owner_name ?? null,
                    ownerEmail: row.owner_email ?? null,
                    mitigationPlanA: row.mitigation_plan_a ?? null,
                    mitigationPlanB: row.mitigation_plan_b ?? null,
                    followUpNotes: row.follow_up_notes ?? null,
                    followUpFrequency: row.follow_up_frequency ?? null,
                    dueDate: toIsoString(row.due_date),
                    lastFollowUpAt: toIsoString(row.last_follow_up_at),
                    projectRiskArchived: row.project_risk_archived ?? false,
                    projectRiskUpdatedAt: toIsoString(row.project_risk_updated_at),
                });
            }
        });

        const legacyReportIds = reportIds.filter((id) => !snapshotReportIds.has(id));
        if (legacyReportIds.length > 0) {
            const legacyRisksResult = await executor.query(
                `
                SELECT id::text, report_id::text, position, name, probability, consequence
                FROM report_risks
                WHERE report_id::text = ANY($1::text[])
                ORDER BY position ASC, id::uuid ASC
            `,
                [legacyReportIds],
            );
            legacyRisksResult.rows.forEach((row) => {
                const report = reportMap.get(row.report_id);
                if (report) {
                    report.state.risks.push({
                        id: row.id,
                        name: row.name,
                        s: Number(row.probability ?? 1),
                        k: Number(row.consequence ?? 1),
                    });
                }
            });
        }

        const phases = await fetchReportItems(`
            SELECT id::text, report_id::text, label, start_percentage::float, end_percentage::float, highlight, workstream_id::text, start_date, end_date, status
            FROM report_phases
            WHERE report_id::text = ANY($1::text[])
            ORDER BY start_percentage ASC
        `);
        phases.forEach((row) => {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.phases.push({
                    id: row.id,
                    text: row.label,
                    start: Number(row.start_percentage ?? 0),
                    end: Number(row.end_percentage ?? 0),
                    highlight: row.highlight ?? 'blue',
                    workstreamId: row.workstream_id ?? null,
                    startDate: toDateOnly(row.start_date),
                    endDate: toDateOnly(row.end_date),
                    status: row.status ?? null,
                });
            }
        });

        const milestones = await fetchReportItems(`
            SELECT id::text, report_id::text, label, position_percentage::float, workstream_id::text, due_date, status
            FROM report_milestones
            WHERE report_id::text = ANY($1::text[])
            ORDER BY position_percentage ASC
        `);
        milestones.forEach((row) => {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.milestones.push({
                    id: row.id,
                    text: row.label,
                    position: Number(row.position_percentage ?? 0),
                    workstreamId: row.workstream_id ?? null,
                    date: toDateOnly(row.due_date),
                    status: row.status ?? null,
                });
            }
        });

        const checklistRows = await fetchReportItems(`
            SELECT c.id::text, d.report_id::text, c.deliverable_id::text, c.position, c.text, c.completed
            FROM report_deliverable_checklist c
            JOIN report_deliverables d ON d.id = c.deliverable_id
            WHERE d.report_id::text = ANY($1::text[])
            ORDER BY c.position ASC, c.id::uuid ASC
        `);
        const checklistMap = new Map();
        checklistRows.forEach((row) => {
            if (!checklistMap.has(row.deliverable_id)) {
                checklistMap.set(row.deliverable_id, []);
            }
            checklistMap.get(row.deliverable_id).push({
                id: row.id,
                text: row.text,
                completed: Boolean(row.completed),
            });
        });

        const deliverables = await fetchReportItems(`
            SELECT
                id::text,
                report_id::text,
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
                progress::float
            FROM report_deliverables
            WHERE report_id::text = ANY($1::text[])
            ORDER BY position_percentage ASC
        `);
        deliverables.forEach((row) => {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.deliverables.push({
                    id: row.id,
                    text: row.label,
                    position: Number(row.position_percentage ?? 0),
                    milestoneId: row.milestone_id ?? null,
                    status: row.status ?? null,
                    owner: row.owner_name ?? null,
                    ownerId: row.owner_employee_id ?? null,
                    description: row.description ?? null,
                    notes: row.notes ?? null,
                    startDate: toDateOnly(row.start_date),
                    endDate: toDateOnly(row.end_date),
                    progress: typeof row.progress === 'number' ? Number(row.progress) : null,
                    checklist: checklistMap.get(row.id) ?? [],
                });
            }
        });

        const tasks = await fetchReportItems(`
            SELECT id::text, report_id::text, content, status, assignee, due_date, notes, created_at
            FROM report_kanban_tasks
            WHERE report_id::text = ANY($1::text[])
            ORDER BY id::uuid ASC
        `);
        tasks.forEach((row) => {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.kanbanTasks.push({
                    id: row.id,
                    content: row.content,
                    status: row.status,
                    assignee: row.assignee ?? null,
                    dueDate: toDateOnly(row.due_date),
                    notes: row.notes ?? null,
                    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
                });
            }
        });
    }

    projects.forEach((project) => {
        project.projectMembers.sort((a, b) => {
            if (a.group !== b.group) return a.group.localeCompare(b.group);
            if (a.role !== b.role) return a.role.localeCompare(b.role);
            return a.id.localeCompare(b.id);
        });
        project.reports.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
    });

    return { projects, employees, settings };
};
export const applyWorkspacePermissions = (workspace, user) => {
    if (!user) {
        return workspace;
    }

    const settings = {
        pmoBaselineHoursWeek: toNonNegativeCapacity(
            workspace?.settings?.pmoBaselineHoursWeek ?? 0,
        ),
    };

    const employeeId = user.employeeId ?? null;
    const isAdmin = user.role === 'Administrator';
    const isLeader = user.role === 'Projektleder';
    const isTeamMember = user.role === 'Teammedlem';

    const leadProjectIds = new Set();
    const memberProjectIds = new Set();

    workspace.projects.forEach((project) => {
        project.projectMembers.forEach((member) => {
            if (employeeId && member.employeeId === employeeId) {
                memberProjectIds.add(project.id);
                if (member.isProjectLead) {
                    leadProjectIds.add(project.id);
                }
            }
        });
    });

    let projects = workspace.projects;
    if (isTeamMember) {
        projects = projects.filter((project) => memberProjectIds.has(project.id));
    }

    projects = projects.map((project) => ({
        ...project,
        permissions: {
            canEdit: isAdmin || (isLeader && leadProjectIds.has(project.id)),
            canLogTime: isAdmin || isLeader || (isTeamMember && memberProjectIds.has(project.id)),
        },
    }));

    let employees = workspace.employees;
    if (isTeamMember) {
        const visibleEmployeeIds = new Set();
        projects.forEach((project) => {
            project.projectMembers.forEach((member) => visibleEmployeeIds.add(member.employeeId));
        });
        employees = employees.filter((employee) => visibleEmployeeIds.has(employee.id));
    }

    return { projects, employees, settings };
};

export const ensureEmployeeLinkForUser = async (executor, user) => {
    if (!user || !user.id) {
        return user;
    }

    const effectiveUser = { ...user };
    let employeeId = user.employeeId && isValidUuid(user.employeeId) ? user.employeeId : null;
    let email = user.email ? normalizeEmail(user.email) : null;
    const fallbackName = typeof user.name === 'string' ? user.name.trim() : '';

    if (!employeeId || !email) {
        const dbUserResult = await executor.query(
            'SELECT employee_id::text, email FROM users WHERE id = $1::uuid',
            [user.id],
        );

        if (dbUserResult.rowCount > 0) {
            const dbRow = dbUserResult.rows[0];
            if (!employeeId && dbRow.employee_id && isValidUuid(dbRow.employee_id)) {
                employeeId = dbRow.employee_id;
            }
            if (!email && dbRow.email) {
                email = normalizeEmail(dbRow.email);
            }
        }
    }

    if (employeeId && email) {
        let resolvedEmployeeId = employeeId;
        const employeeById = await executor.query(
            'SELECT 1 FROM employees WHERE id = $1::uuid',
            [employeeId],
        );
        if (employeeById.rowCount === 0) {
            const employeeByEmail = await executor.query(
                'SELECT id::text FROM employees WHERE LOWER(email) = $1',
                [email],
            );
            if (employeeByEmail.rowCount > 0) {
                resolvedEmployeeId = employeeByEmail.rows[0].id;
            } else {
                await executor.query(
                    'INSERT INTO employees (id, name, email) VALUES ($1::uuid, $2, LOWER($3)) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email',
                    [employeeId, fallbackName || email, email],
                );
            }

            if (resolvedEmployeeId !== employeeId) {
                employeeId = resolvedEmployeeId;
                await executor.query(
                    'UPDATE users SET employee_id = $1::uuid WHERE id = $2::uuid',
                    [employeeId, user.id],
                );
            }
        }

        return { ...effectiveUser, employeeId, email };
    }

    if (!email) {
        return { ...effectiveUser, employeeId: null };
    }

    const employeeResult = await executor.query(
        'SELECT id::text FROM employees WHERE LOWER(email) = $1',
        [email],
    );

    if (employeeResult.rowCount > 0) {
        employeeId = employeeResult.rows[0].id;
    } else {
        const insertEmployee = await executor.query(
            'INSERT INTO employees (name, email) VALUES ($1, LOWER($2)) RETURNING id::text',
            [fallbackName || email, email],
        );
        employeeId = insertEmployee.rows[0].id;
    }

    await executor.query(
        'UPDATE users SET employee_id = $1::uuid WHERE id = $2::uuid',
        [employeeId, user.id],
    );

    return { ...effectiveUser, employeeId, email };
};

export const buildWorkspaceForUser = async (user, clientOverride) => {
    const executor = clientOverride ?? pool;
    const effectiveUser = await ensureEmployeeLinkForUser(executor, user);
    const workspace = await loadFullWorkspace(clientOverride);
    return applyWorkspacePermissions(workspace, effectiveUser);
};export const getUserEditableProjects = (workspace, user) => {
    const editable = new Set();
    if (!user) return editable;
    const employeeId = user.employeeId ?? null;
    if (user.role === 'Administrator') {
        workspace.projects.forEach((project) => editable.add(project.id));
        return editable;
    }
    if (user.role === 'Projektleder' && employeeId) {
        workspace.projects.forEach((project) => {
            if (project.projectMembers.some((member) => member.employeeId === employeeId && member.isProjectLead)) {
                editable.add(project.id);
            }
        });
    }
    return editable;
};

const syncEmployees = async (client, employeesPayload, projectsPayload, user, editableProjectIds) => {
    const employeesArray = Array.isArray(employeesPayload) ? employeesPayload : [];
    if (!employeesArray.length) return;

    const existingResult = await client.query(`
        SELECT id::text, email, location, azure_ad_id, department, job_title, account_enabled, synced_at
        FROM employees
    `);
    const existingById = new Map(existingResult.rows.map((row) => [row.id, row]));
    const existingByEmail = new Map(existingResult.rows.map((row) => [normalizeEmail(row.email), row]));

    const allowedEmployeeIds = new Set();
    if (user.role === 'Administrator') {
        employeesArray.forEach((employee) => {
            if (employee?.id && isValidUuid(employee.id)) {
                allowedEmployeeIds.add(employee.id);
            }
        });
    } else {
        const projectsArray = Array.isArray(projectsPayload) ? projectsPayload : [];
        projectsArray.forEach((project) => {
            const projectId = project?.id;
            if (!editableProjectIds.has(projectId)) return;
            (project.projectMembers || []).forEach((member) => {
                if (member?.employeeId) {
                    allowedEmployeeIds.add(member.employeeId);
                }
            });
        });
    }

    for (const employee of employeesArray) {
        if (!employee) continue;
        let employeeId = ensureUuid(employee.id);
        const email = normalizeEmail(employee.email);
        if (!email) continue;

        let existingByIdRow = existingById.get(employeeId);
        const existingByEmailRow = existingByEmail.get(email);
        if (!existingByIdRow && existingByEmailRow) {
            employeeId = existingByEmailRow.id;
            existingByIdRow = existingByEmailRow;
        }
        const persistedRow = existingById.get(employeeId) ?? existingByEmailRow ?? null;

        if (user.role !== 'Administrator' && !allowedEmployeeIds.has(employeeId)) {
            continue;
        }

        const maxCapacity = toNonNegativeCapacity(employee.maxCapacityHoursWeek);
        const { canonical: canonicalDepartmentLocation, location: mirroredLocation, department: mirroredDepartment } =
            resolveDepartmentLocation(employee, persistedRow ?? undefined);

        await client.query(
            `
            INSERT INTO employees (id, name, email, location, department, max_capacity_hours_week)
            VALUES ($1::uuid, $2, LOWER($3), NULLIF($4, ''), NULLIF($5, ''), $6::numeric)
            ON CONFLICT (id)
            DO UPDATE
            SET name = EXCLUDED.name,
                email = EXCLUDED.email,
                location = EXCLUDED.location,
                department = EXCLUDED.department,
                max_capacity_hours_week = EXCLUDED.max_capacity_hours_week;
        `,
            [
                employeeId,
                (employee.name ?? '').trim() || 'Ukendt navn',
                email,
                mirroredLocation,
                mirroredDepartment,
                maxCapacity,
            ],
        );

        employee.id = employeeId;
        employee.maxCapacityHoursWeek = maxCapacity;
        employee.location = mirroredLocation;
        employee.department = mirroredDepartment;

        const azureAdId = persistedRow?.azure_ad_id ?? employee.azureAdId ?? null;
        const jobTitle = persistedRow?.job_title ?? employee.jobTitle ?? null;
        const accountEnabled =
            typeof employee.accountEnabled === 'boolean'
                ? employee.accountEnabled
                : persistedRow?.account_enabled ?? true;
        const syncedAtRaw = employee.syncedAt ?? persistedRow?.synced_at ?? null;
        const syncedAtIso = syncedAtRaw ? new Date(syncedAtRaw).toISOString() : null;

        employee.azureAdId = azureAdId;
        employee.jobTitle = jobTitle;
        employee.accountEnabled = accountEnabled;
        employee.syncedAt = syncedAtIso;

        const updatedRow = {
            id: employeeId,
            email,
            azure_ad_id: azureAdId,
            location: canonicalDepartmentLocation,
            department: canonicalDepartmentLocation,
            job_title: jobTitle,
            account_enabled: accountEnabled,
            synced_at: syncedAtIso,
        };

        existingById.set(employeeId, updatedRow);
        existingByEmail.set(email, updatedRow);
    }
};

const syncTimeEntries = async (client, projectMemberId, timeEntriesPayload) => {
    await client.query('DELETE FROM project_member_time_entries WHERE project_member_id = $1::uuid', [projectMemberId]);
    const entries = Array.isArray(timeEntriesPayload) ? timeEntriesPayload : [];
    for (const entry of entries) {
        if (!entry || !entry.weekKey) continue;
        const planned = Number.isFinite(entry.plannedHours) ? Math.max(Number(entry.plannedHours), 0) : 0;
        const actual = Number.isFinite(entry.actualHours) ? Math.max(Number(entry.actualHours), 0) : 0;
        await client.query(`
            INSERT INTO project_member_time_entries (project_member_id, week_key, planned_hours, actual_hours)
            VALUES ($1::uuid, $2, $3, $4)
        `, [projectMemberId, entry.weekKey, planned, actual]);
    }
};
export const syncProjectWorkstreams = async (client, projectId, workstreamsPayload) => {
    if (!Array.isArray(workstreamsPayload)) {
        return;
    }

    const existingResult = await client.query(
        'SELECT id::text FROM project_workstreams WHERE project_id = $1::uuid',
        [projectId],
    );
    const existingIds = new Set(existingResult.rows.map((row) => row.id));
    const seenIds = new Set();

    const sanitized = workstreamsPayload
        .map((stream, index) => {
            if (!stream) {
                return null;
            }
            const name = typeof stream.name === 'string' ? stream.name.trim() : '';
            if (!name) {
                return null;
            }
            return {
                id: stream.id && isValidUuid(stream.id) ? stream.id : ensureUuid(),
                name,
                order: Number.isFinite(stream.order) ? Number(stream.order) : index,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.order - b.order)
        .map((stream, index) => ({ ...stream, order: index }));

    for (const stream of sanitized) {
        seenIds.add(stream.id);
        await client.query(
            `
            INSERT INTO project_workstreams (id, project_id, name, sort_order)
            VALUES ($1::uuid, $2::uuid, $3, $4)
            ON CONFLICT (id)
            DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `,
            [stream.id, projectId, stream.name, stream.order],
        );
    }

    const idsToDelete = [...existingIds].filter((id) => !seenIds.has(id));
    if (idsToDelete.length > 0) {
        await client.query('DELETE FROM project_workstreams WHERE project_id = $1::uuid AND id = ANY($2::uuid[])', [
            projectId,
            idsToDelete,
        ]);
    }
};
const syncReportState = async (client, reportId, state, existingState = null) => {
    const safeState = state ?? {};
    const previousState = existingState ?? {};
    const { value: reportIdValue, sqlType: reportIdSqlType } = classifyReportIdentifier(reportId);
    const reportIdCast = `::${reportIdSqlType}`;

    const resetTables = [
        'report_status_items',
        'report_challenge_items',
        'report_next_step_items',
        'report_main_table_rows',
        'report_phases',
        'report_milestones',
        'report_deliverables',
        'report_kanban_tasks',
    ];

    if (!config.features.projectRiskAnalysisEnabled) {
        resetTables.push('report_risks');
    }

    for (const table of resetTables) {
        await client.query(`DELETE FROM ${table} WHERE report_id = $1${reportIdCast}`, [reportIdValue]);
    }

    const statusUsedIds = new Set((previousState.statusItems ?? []).map((item) => item?.id).filter(Boolean));
    const challengeUsedIds = new Set((previousState.challengeItems ?? []).map((item) => item?.id).filter(Boolean));
    const nextStepUsedIds = new Set((previousState.nextStepItems ?? []).map((item) => item?.id).filter(Boolean));
    const mainRowUsedIds = new Set((previousState.mainTableRows ?? []).map((item) => item?.id).filter(Boolean));
    const riskUsedIds = new Set((previousState.risks ?? []).map((item) => item?.id).filter(Boolean));
    const phaseUsedIds = new Set((previousState.phases ?? []).map((item) => item?.id).filter(Boolean));
    const milestoneUsedIds = new Set((previousState.milestones ?? []).map((item) => item?.id).filter(Boolean));
    const deliverableUsedIds = new Set((previousState.deliverables ?? []).map((item) => item?.id).filter(Boolean));
    const taskUsedIds = new Set((previousState.kanbanTasks ?? []).map((item) => item?.id).filter(Boolean));
    const deliverableChecklistUsedIds = new Set(
        (previousState.deliverables ?? [])
            .flatMap((deliverable) => (deliverable.checklist ?? []).map((item) => item?.id))
            .filter(Boolean),
    );
    const milestoneIdReference = new Map();

    const ensureStableId = (candidate, usedSet) => {
        if (typeof candidate === 'string' && candidate.trim().length > 0 && !usedSet.has(candidate)) {
            usedSet.add(candidate);
            return candidate;
        }

        let candidateId = ensureUuid();
        while (usedSet.has(candidateId)) {
            candidateId = ensureUuid();
        }
        usedSet.add(candidateId);
        return candidateId;
    };

    const insertListItems = async (items, tableName, usedSet) => {
        const list = Array.isArray(items) ? items : [];
        for (let index = 0; index < list.length; index += 1) {
            const item = list[index];
            if (!item) continue;
            let itemId = ensureStableId(item.id, usedSet);
            item.id = itemId;
            const content = typeof item.content === 'string' ? item.content : '';

            for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                    await client.query(
                        `
                INSERT INTO ${tableName} (id, report_id, position, content)
                VALUES ($1::uuid, $2${reportIdCast}, $3, $4)
            `,
                        [itemId, reportIdValue, index, content],
                    );
                    break;
                } catch (error) {
                    if (error.code === '23505' && attempt < 2) {
                        usedSet.delete(itemId);
                        itemId = ensureStableId(null, usedSet);
                        item.id = itemId;
                        continue;
                    }
                    throw error;
                }
            }
        }
    };

    await insertListItems(safeState.statusItems, 'report_status_items', statusUsedIds);
    await insertListItems(safeState.challengeItems, 'report_challenge_items', challengeUsedIds);
    await insertListItems(safeState.nextStepItems, 'report_next_step_items', nextStepUsedIds);

    const mainRows = Array.isArray(safeState.mainTableRows) ? safeState.mainTableRows : [];
    for (let index = 0; index < mainRows.length; index += 1) {
        const row = mainRows[index];
        if (!row) continue;
        let rowId = ensureStableId(row.id, mainRowUsedIds);
        row.id = rowId;
        const status = ['green', 'yellow', 'red'].includes(row.status) ? row.status : 'green';
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await client.query(
                    `
            INSERT INTO report_main_table_rows (id, report_id, position, title, status, note)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4, $5, $6)
        `,
                    [rowId, reportIdValue, index, row.title ?? '', status, row.note ?? null],
                );
                break;
            } catch (error) {
                if (error.code === '23505' && attempt < 2) {
                    mainRowUsedIds.delete(rowId);
                    rowId = ensureStableId(null, mainRowUsedIds);
                    row.id = rowId;
                    continue;
                }
                throw error;
            }
        }
    }

    if (!config.features.projectRiskAnalysisEnabled) {
        const risks = Array.isArray(safeState.risks) ? safeState.risks : [];
        for (let index = 0; index < risks.length; index += 1) {
            const risk = risks[index];
            if (!risk) continue;
            let riskId = ensureStableId(risk.id, riskUsedIds);
            risk.id = riskId;
            const probability = Number.isFinite(risk.s) ? Math.max(1, Math.min(5, Number(risk.s))) : 1;
            const consequence = Number.isFinite(risk.k) ? Math.max(1, Math.min(5, Number(risk.k))) : 1;
            for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                    await client.query(
                        `
                INSERT INTO report_risks (id, report_id, position, name, probability, consequence)
                VALUES ($1::uuid, $2${reportIdCast}, $3, $4, $5, $6)
            `,
                        [riskId, reportIdValue, index, risk.name ?? '', probability, consequence],
                    );
                    break;
                } catch (error) {
                    if (error.code === '23505' && attempt < 2) {
                        riskUsedIds.delete(riskId);
                        riskId = ensureStableId(null, riskUsedIds);
                        risk.id = riskId;
                        continue;
                    }
                    throw error;
                }
            }
        }
    }

    const phases = Array.isArray(safeState.phases) ? safeState.phases : [];
    for (const phase of phases) {
        if (!phase) continue;
        let phaseId = ensureStableId(phase.id, phaseUsedIds);
        phase.id = phaseId;
        const start = Number.isFinite(phase.start) ? Math.max(0, Math.min(100, Number(phase.start))) : 0;
        const end = Number.isFinite(phase.end) ? Math.max(0, Math.min(100, Number(phase.end))) : start;
        const workstreamId = phase.workstreamId && isValidUuid(phase.workstreamId) ? phase.workstreamId : null;
        const startDate = toDateOnly(phase.startDate);
        const endDate = toDateOnly(phase.endDate);
        const phaseStatus = PHASE_STATUS_OPTIONS.has(phase.status) ? phase.status : null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await client.query(
                    `
            INSERT INTO report_phases (id, report_id, label, start_percentage, end_percentage, highlight, workstream_id, start_date, end_date, status)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4, $5, $6, $7::uuid, $8::date, $9::date, $10)
        `,
                    [
                        phaseId,
                        reportIdValue,
                        phase.text ?? '',
                        start,
                        end,
                        phase.highlight ?? 'blue',
                        workstreamId,
                        startDate,
                        endDate,
                        phaseStatus,
                    ],
                );
                break;
            } catch (error) {
                if (error.code === '23505' && attempt < 2) {
                    phaseUsedIds.delete(phaseId);
                    phaseId = ensureStableId(null, phaseUsedIds);
                    phase.id = phaseId;
                    continue;
                }
                throw error;
            }
        }
    }

    const milestones = Array.isArray(safeState.milestones) ? safeState.milestones : [];
    for (const milestone of milestones) {
        if (!milestone) continue;
        const originalMilestoneId = milestone.id;
        let milestoneId = ensureStableId(milestone.id, milestoneUsedIds);
        milestone.id = milestoneId;
        milestoneIdReference.set(originalMilestoneId ?? milestoneId, milestoneId);
        const position = Number.isFinite(milestone.position) ? Math.max(0, Math.min(100, Number(milestone.position))) : 0;
        const workstreamId = milestone.workstreamId && isValidUuid(milestone.workstreamId) ? milestone.workstreamId : null;
        const dueDate = toDateOnly(milestone.date);
        const milestoneStatus = MILESTONE_STATUS_OPTIONS.has(milestone.status) ? milestone.status : null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await client.query(
                    `
            INSERT INTO report_milestones (id, report_id, label, position_percentage, workstream_id, due_date, status)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4, $5::uuid, $6::date, $7)
        `,
                    [milestoneId, reportIdValue, milestone.text ?? '', position, workstreamId, dueDate, milestoneStatus],
                );
                break;
            } catch (error) {
                if (error.code === '23505' && attempt < 2) {
                    milestoneUsedIds.delete(milestoneId);
                    milestoneId = ensureStableId(null, milestoneUsedIds);
                    milestone.id = milestoneId;
                    continue;
                }
                throw error;
            }
        }
    }

    const deliverables = Array.isArray(safeState.deliverables) ? safeState.deliverables : [];
    for (const deliverable of deliverables) {
        if (!deliverable) continue;
        let deliverableId = ensureStableId(deliverable.id, deliverableUsedIds);
        deliverable.id = deliverableId;
        const position = Number.isFinite(deliverable.position) ? Math.max(0, Math.min(100, Number(deliverable.position))) : 0;
        const milestoneRefId = deliverable.milestoneId
            ? milestoneIdReference.get(deliverable.milestoneId) ?? (isValidUuid(deliverable.milestoneId) ? deliverable.milestoneId : null)
            : null;
        const deliverableStatus = DELIVERABLE_STATUS_OPTIONS.has(deliverable.status) ? deliverable.status : null;
        const ownerName = typeof deliverable.owner === 'string' ? deliverable.owner.trim() || null : null;
        const ownerId = deliverable.ownerId && isValidUuid(deliverable.ownerId) ? deliverable.ownerId : null;
        const description = typeof deliverable.description === 'string' ? deliverable.description : null;
        const notes = typeof deliverable.notes === 'string' ? deliverable.notes : null;
        const startDate = toDateOnly(deliverable.startDate);
        const endDate = toDateOnly(deliverable.endDate);
        const progress =
            typeof deliverable.progress === 'number' && Number.isFinite(deliverable.progress)
                ? Math.max(0, Math.min(100, Number(deliverable.progress)))
                : null;
        const checklistItems = Array.isArray(deliverable.checklist) ? deliverable.checklist : [];
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await client.query(
                    `
            INSERT INTO report_deliverables (id, report_id, label, position_percentage, milestone_id, status, owner_name, owner_employee_id, description, notes, start_date, end_date, progress)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4, $5::uuid, $6, $7, $8::uuid, $9, $10, $11::date, $12::date, $13)
        `,
                    [
                        deliverableId,
                        reportIdValue,
                        deliverable.text ?? '',
                        position,
                        milestoneRefId,
                        deliverableStatus,
                        ownerName,
                        ownerId,
                        description,
                        notes,
                        startDate,
                        endDate,
                        progress,
                    ],
                );
                break;
            } catch (error) {
                if (error.code === '23505' && attempt < 2) {
                    deliverableUsedIds.delete(deliverableId);
                    deliverableId = ensureStableId(null, deliverableUsedIds);
                    deliverable.id = deliverableId;
                    continue;
                }
                throw error;
            }
        }

        for (let index = 0; index < checklistItems.length; index += 1) {
            const item = checklistItems[index];
            if (!item) continue;
            let checklistId = ensureStableId(item.id, deliverableChecklistUsedIds);
            for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                    await client.query(
                        `
                INSERT INTO report_deliverable_checklist (id, deliverable_id, position, text, completed)
                VALUES ($1::uuid, $2::uuid, $3, $4, $5)
            `,
                        [
                            checklistId,
                            deliverableId,
                            index,
                            typeof item.text === 'string' ? item.text : '',
                            item.completed === true,
                        ],
                    );
                    break;
                } catch (error) {
                    if (error.code === '23505' && attempt < 2) {
                        deliverableChecklistUsedIds.delete(checklistId);
                        checklistId = ensureStableId(null, deliverableChecklistUsedIds);
                        continue;
                    }
                    throw error;
                }
            }
        }
    }

        const tasks = Array.isArray(safeState.kanbanTasks) ? safeState.kanbanTasks : [];
        for (const task of tasks) {
            if (!task) continue;
            let taskId = ensureStableId(task.id, taskUsedIds);
            task.id = taskId;
            const status = ['todo', 'doing', 'done'].includes(task.status) ? task.status : 'todo';
            const dueDate = toDateOnly(task.dueDate);
            const createdAt = task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString();
            for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                    await client.query(
                        `
            INSERT INTO report_kanban_tasks (id, report_id, content, status, assignee, due_date, notes, created_at)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4, $5, $6::date, $7, $8::timestamptz)
        `,
                        [
                            taskId,
                            reportIdValue,
                            task.content ?? '',
                            status,
                            task.assignee ?? null,
                            dueDate,
                            task.notes ?? null,
                            createdAt,
                        ],
                    );
                    break;
                } catch (error) {
                    if (error.code === '23505' && attempt < 2) {
                        taskUsedIds.delete(taskId);
                        taskId = ensureStableId(null, taskUsedIds);
                        task.id = taskId;
                        continue;
                    }
                    throw error;
                }
            }
        }
};

const syncProjectMembers = async (client, projectId, membersPayload, existingProject = null) => {
    const membersArray = Array.isArray(membersPayload) ? membersPayload : [];

    const existingDbResult = await client.query(
        'SELECT id::text, employee_id::text FROM project_members WHERE project_id = $1::uuid',
        [projectId],
    );
    const existingIds = new Set(existingDbResult.rows.map((row) => row.id));
    const seenIds = new Set();

    const existingWorkspaceProject = existingProject || { projectMembers: [] };
    const workspaceMemberByEmployee = new Map(
        (existingWorkspaceProject.projectMembers || []).map((member) => [member.employeeId, member]),
    );

    for (const member of membersArray) {
        if (!member || !member.employeeId) continue;
        const memberId = ensureUuid(member.id);
        const role = (member.role ?? '').trim() || 'Medlem';
        const group = member.group ?? 'unassigned';
        let isLead = typeof member.isProjectLead === 'boolean'
            ? member.isProjectLead
            : role.toLowerCase().includes('leder');

        if (!isLead) {
            const existingMember = workspaceMemberByEmployee.get(member.employeeId) ?? null;
            if (existingMember?.isProjectLead) {
                isLead = true;
            }
        }

        await client.query(
            `
            INSERT INTO project_members (id, project_id, employee_id, role, member_group, is_project_lead)
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
            ON CONFLICT (id)
            DO UPDATE SET role = EXCLUDED.role, member_group = EXCLUDED.member_group, is_project_lead = EXCLUDED.is_project_lead
        `,
            [memberId, projectId, member.employeeId, role, group, isLead],
        );

        await syncTimeEntries(client, memberId, member.timeEntries);
        seenIds.add(memberId);
    }

    const idsToDelete = Array.from(existingIds).filter((id) => !seenIds.has(id));
    if (idsToDelete.length > 0) {
        await client.query('DELETE FROM project_members WHERE project_id = $1::uuid AND id = ANY($2::uuid[])', [projectId, idsToDelete]);
    }
};

export const syncProjectReports = async (client, projectId, reportsPayload, existingProject = null) => {
    const reportsArray = Array.isArray(reportsPayload) ? reportsPayload : [];
    const existingResult = await client.query('SELECT id::text, week_key FROM reports WHERE project_id = $1::uuid', [projectId]);
    const existingByWeek = new Map(existingResult.rows.map((row) => [row.week_key, row.id]));
    const existingWorkspaceReports = Array.isArray(existingProject?.reports) ? existingProject.reports : [];
    const existingWorkspaceReportByWeek = new Map(existingWorkspaceReports.map((report) => [report.weekKey, report]));
    const seenReportIds = new Set();

    for (const report of reportsArray) {
        if (!report || !report.weekKey) continue;
        const weekKey = report.weekKey;
        let reportId = existingByWeek.get(weekKey);
        if (!reportId) {
            const insertResult = await client.query(
                'INSERT INTO reports (project_id, week_key) VALUES ($1::uuid, $2) RETURNING id::text',
                [projectId, weekKey],
            );
            reportId = insertResult.rows[0].id;
            existingByWeek.set(weekKey, reportId);
        }
        seenReportIds.add(reportId);
        await syncReportState(client, reportId, report.state, existingWorkspaceReportByWeek.get(weekKey)?.state ?? null);
    }

    const reportsToDelete = existingResult.rows
        .map((row) => row.id)
        .filter((id) => !seenReportIds.has(id));
    if (reportsToDelete.length > 0) {
        const deleteBuckets = reportsToDelete.reduce((buckets, rawId) => {
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
    }
};

const syncProjects = async (client, projectsPayload, user, editableProjectIds, existingProjectById = new Map()) => {
    const projectsArray = Array.isArray(projectsPayload) ? projectsPayload : [];
    const userIsAdmin = user.role === 'Administrator';
    for (const project of projectsArray) {
        if (!project) continue;
        const normalisedProjectId = ensureUuid(project.id);
        const existingProject = existingProjectById.get(normalisedProjectId) || existingProjectById.get(project.id) || null;
        const canEdit = userIsAdmin || editableProjectIds.has(project.id) || editableProjectIds.has(normalisedProjectId);
        if (!canEdit) {
            logDebug('syncProjects', 'Skip project (no edit permission)', {
                projectId: normalisedProjectId,
                originalId: project.id,
                role: user.role,
                editableProjectIds: Array.from(editableProjectIds),
            });
            continue;
        }

        logDebug('syncProjects', 'Persist project', {
            projectId: normalisedProjectId,
            name: (project.config ?? {}).projectName ?? null,
        });

        const config = project.config ?? {};
        const projectName = (config.projectName ?? '').trim() || 'Nyt projekt';
        const startDate = config.projectStartDate || toDateOnly(new Date());
        const endDate = config.projectEndDate || startDate;
        const status = ['active', 'completed', 'on-hold'].includes(project.status) ? project.status : 'active';
        const description = typeof project.description === 'string' ? project.description : null;
        const projectGoal = typeof config.projectGoal === 'string' ? config.projectGoal : null;
        const businessCase = typeof config.businessCase === 'string' ? config.businessCase : null;
        const heroImageUrl = typeof config.heroImageUrl === 'string' ? config.heroImageUrl.trim() || null : null;
        let totalBudget = null;
        if (typeof config.totalBudget === 'number' && Number.isFinite(config.totalBudget)) {
            totalBudget = Math.round(config.totalBudget * 100) / 100;
        } else if (typeof config.totalBudget === 'string') {
            const parsed = Number(config.totalBudget.replace(',', '.'));
            if (Number.isFinite(parsed)) {
                totalBudget = Math.round(parsed * 100) / 100;
            }
        }

        await client.query(`
            INSERT INTO projects (id, name, start_date, end_date, status, description, project_goal, business_case, total_budget, hero_image_url)
            VALUES ($1::uuid, $2, $3::date, $4::date, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id)
            DO UPDATE SET
                name = EXCLUDED.name,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                status = EXCLUDED.status,
                description = EXCLUDED.description,
                project_goal = EXCLUDED.project_goal,
                business_case = EXCLUDED.business_case,
                total_budget = EXCLUDED.total_budget,
                hero_image_url = EXCLUDED.hero_image_url
        `, [normalisedProjectId, projectName, startDate, endDate, status, description, projectGoal, businessCase, totalBudget, heroImageUrl]);

        if (Array.isArray(project.workstreams)) {
            await syncProjectWorkstreams(client, normalisedProjectId, project.workstreams);
        }
        await syncProjectMembers(client, normalisedProjectId, project.projectMembers, existingProject);
        await syncProjectReports(client, normalisedProjectId, project.reports, existingProject);
    }
};

export const persistWorkspace = async (workspaceData, user) => {
    if (!workspaceData || !user) throw new Error('Invalid payload');
    if (user.role !== 'Administrator' && user.role !== 'Projektleder') {
        const error = new Error('Forbidden');
        error.statusCode = 403;
        throw error;
    }

    logDebug('persistWorkspace', 'Begin', {
        userId: user.id,
        role: user.role,
        employeeId: user.employeeId ?? null,
        projectCount: Array.isArray(workspaceData.projects) ? workspaceData.projects.length : 0,
        employeeCount: Array.isArray(workspaceData.employees) ? workspaceData.employees.length : 0,
    });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const effectiveUser = await ensureEmployeeLinkForUser(client, user);
        logDebug('persistWorkspace', 'Effective user', {
            userId: effectiveUser?.id ?? null,
            role: effectiveUser?.role ?? null,
            employeeId: effectiveUser?.employeeId ?? null,
        });
        const currentWorkspace = await loadFullWorkspace(client);
        const editableProjectIds = getUserEditableProjects(currentWorkspace, effectiveUser);
        logDebug('persistWorkspace', 'Editable projects resolved', { editableProjectIds: Array.from(editableProjectIds) });

        const existingProjectById = new Map((currentWorkspace.projects || []).map((project) => [project.id, project]));

        const projectsArray = Array.isArray(workspaceData.projects) ? workspaceData.projects : [];
        for (const project of projectsArray) {
            if (!project) continue;
            const originalProjectId = project.id;
            const projectId = ensureUuid(project.id);
            project.id = projectId;

            logDebug('persistWorkspace', 'Evaluate project', {
                projectId,
                originalProjectId,
                name: project?.config?.projectName ?? '',
                allowedInitially: editableProjectIds.has(projectId) || editableProjectIds.has(originalProjectId),
            });

            if (!editableProjectIds.has(projectId) && !editableProjectIds.has(originalProjectId)) {
                const employeeId = effectiveUser.employeeId ?? null;
                if (effectiveUser.role === 'Projektleder' && employeeId) {
                    const memberList = Array.isArray(project.projectMembers) ? project.projectMembers : [];
                    logDebug('persistWorkspace', 'Project members snapshot', {
                        projectId,
                        employeeId,
                        members: memberList.map((member) => ({
                            id: member?.id ?? null,
                            employeeId: member?.employeeId ?? null,
                            role: member?.role ?? null,
                            isProjectLead: member?.isProjectLead ?? null,
                            group: member?.group ?? null,
                        })),
                    });

                    let isLead = memberList.some((member) => member?.employeeId === employeeId
                        && (member.isProjectLead || (member.role ?? '').toLowerCase().includes('leder')));

                    if (!isLead) {
                        const memberRecord = memberList.find((member) => member?.employeeId === employeeId);

                        if (memberRecord) {
                            const roleText = (memberRecord.role ?? '').toLowerCase();
                            if (roleText.includes('projektleder') || roleText.includes('project manager') || roleText.includes('leder')) {
                                memberRecord.isProjectLead = true;
                                isLead = true;
                                logDebug('persistWorkspace', 'Promoting projectleder to lead', { projectId, employeeId, reason: 'role-match' });
                            } else {
                                logDebug('persistWorkspace', 'Projektleder member lacks lead role flag', {
                                    projectId,
                                    employeeId,
                                    role: memberRecord.role ?? null,
                                });
                                if (!memberRecord.isProjectLead) {
                                    memberRecord.isProjectLead = true;
                                    isLead = true;
                                    logDebug('persistWorkspace', 'Promoting projectleder to lead', { projectId, employeeId, reason: 'fallback-promote' });
                                }
                            }
                        } else {
                            logDebug('persistWorkspace', 'Projektleder not found among project members', { projectId, employeeId });
                            const newMember = {
                                id: ensureUuid(),
                                employeeId,
                                role: 'Projektleder',
                                group: 'projektgruppe',
                                isProjectLead: true,
                                timeEntries: [],
                            };
                            memberList.push(newMember);
                            project.projectMembers = memberList;
                            isLead = true;
                            logDebug('persistWorkspace', 'Added projectleder to project members', { projectId, employeeId });
                        }
                    }

                    if (isLead) {
                        editableProjectIds.add(projectId);
                        logDebug('persistWorkspace', 'Granting lead permissions', { projectId, employeeId });
                    } else {
                        logDebug('persistWorkspace', 'Projektleder is not lead on project', {
                            projectId,
                            employeeId,
                            memberEmployeeIds: memberList.map((member) => member?.employeeId).filter(Boolean),
                        });
                    }
                } else {
                    logDebug('persistWorkspace', 'Skipping project for user', { projectId, role: effectiveUser.role, employeeId });
                }
            }

            logDebug('persistWorkspace', 'Project permission final', { projectId, allowed: editableProjectIds.has(projectId) });
        }

        await syncEmployees(client, workspaceData.employees, workspaceData.projects, effectiveUser, editableProjectIds);
        await syncProjects(client, workspaceData.projects, effectiveUser, editableProjectIds, existingProjectById);

        if (
            workspaceData?.settings &&
            Object.prototype.hasOwnProperty.call(workspaceData.settings, 'pmoBaselineHoursWeek')
        ) {
            const baselineValue = toNonNegativeCapacity(workspaceData.settings.pmoBaselineHoursWeek);
            logDebug('persistWorkspace', 'Persist baseline', { baselineValue });
            await client.query(
                `
                INSERT INTO workspace_settings (id, pmo_baseline_hours_week, updated_at, updated_by)
                VALUES ($1::uuid, $2::numeric, NOW(), $3::uuid)
                ON CONFLICT (id)
                DO UPDATE
                SET pmo_baseline_hours_week = EXCLUDED.pmo_baseline_hours_week,
                    updated_at = NOW(),
                    updated_by = EXCLUDED.updated_by;
            `,
                [WORKSPACE_SETTINGS_SINGLETON_ID, baselineValue, effectiveUser?.id ?? null],
            );
        }

        logDebug('persistWorkspace', 'Sync completed', { editableProjectIds: Array.from(editableProjectIds) });

        await client.query('COMMIT');
        logDebug('persistWorkspace', 'Commit successful', { userId: effectiveUser.id });
    } catch (error) {
        await client.query('ROLLBACK');
        logDebug('persistWorkspace', 'Error during persist', { message: error?.message, stack: error?.stack });
        throw error;
    } finally {
        client.release();
        logDebug('persistWorkspace', 'Client released');
    }
};


