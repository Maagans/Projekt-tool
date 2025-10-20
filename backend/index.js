
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import pool from './db.js';
import authMiddleware from './authMiddleware.js';
import logger from './logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const defaultCorsOrigins = process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173'];
const envCorsOrigins = String(process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = envCorsOrigins.length > 0 ? envCorsOrigins : defaultCorsOrigins;
const allowAllOrigins = allowedOrigins.length === 0;

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};

const createAppError = (message, status = 500, cause) => {
    const error = new Error(message);
    error.status = status;
    error.userMessage = message;
    if (cause) {
        error.cause = cause;
    }
    if (status < 500) {
        error.expose = true;
    }
    return error;
};

const formatZodIssues = (issues) =>
    issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
        message: issue.message,
    }));

const respondValidationError = (res, message, issues) =>
    res.status(400).json({
        success: false,
        message,
        errors: formatZodIssues(issues),
    });

const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required.' })
        .trim()
        .min(1, 'Email is required.')
        .max(320, 'Email must be at most 320 characters.')
        .email('Email must be valid.'),
    password: z
        .string({ required_error: 'Password is required.' })
        .min(1, 'Password is required.')
        .max(256, 'Password must be at most 256 characters.'),
});

const registerSchema = z.object({
    email: z
        .string({ required_error: 'Email is required.' })
        .trim()
        .min(1, 'Email is required.')
        .max(320, 'Email must be at most 320 characters.')
        .email('Email must be valid.'),
    name: z
        .string({ required_error: 'Name is required.' })
        .trim()
        .min(1, 'Name is required.')
        .max(200, 'Name must be at most 200 characters.'),
    password: z
        .string({ required_error: 'Password is required.' })
        .min(6, 'Password must be at least 6 characters long.')
        .max(256, 'Password must be at most 256 characters.'),
});

const optionalNonNegativeNumber = (fieldName) =>
    z
        .preprocess(
            (value) => {
                if (value === undefined || value === null || value === '') return undefined;
                if (typeof value === 'number') return value;
                if (typeof value === 'string') {
                    const parsed = Number(value);
                    return Number.isNaN(parsed) ? value : parsed;
                }
                return value;
            },
            z
                .number({
                    invalid_type_error: `${fieldName} must be a number.`,
                })
                .finite(`${fieldName} must be a finite number.`)
                .min(0, `${fieldName} cannot be negative.`),
        )
        .optional();

const isoWeekPattern = /^\d{4}-W\d{2}$/;

const timeEntryParamsSchema = z.object({
    projectId: z.string({ required_error: 'projectId is required.' }).uuid('projectId must be a valid UUID.'),
});

const timeEntryBodySchema = z
    .object({
        memberId: z.string({ required_error: 'memberId is required.' }).uuid('memberId must be a valid UUID.'),
        weekKey: z
            .string({ required_error: 'weekKey is required.' })
            .trim()
            .regex(isoWeekPattern, 'weekKey must be in the format YYYY-Www.'),
        plannedHours: optionalNonNegativeNumber('plannedHours'),
        actualHours: optionalNonNegativeNumber('actualHours'),
    })
    .refine(
        (data) => data.plannedHours !== undefined || data.actualHours !== undefined,
        {
            message: 'plannedHours or actualHours must be provided.',
            path: ['plannedHours'],
        },
    );

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

const rateWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const rateMax = Number(process.env.RATE_LIMIT_MAX ?? 5);
const authRateLimiter = rateLimit({
    windowMs: rateWindowMs,
    max: rateMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many attempts. Please try again shortly.',
    },
});


app.get('/health', async (req, res, next) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok' });
    } catch (error) {
        logger.error({ err: error }, 'Health check failed');
        return next(createAppError('Health check failed', 503, error));
    }
});

const isValidUuid = (value) => typeof value === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
const ensureUuid = (value) => (isValidUuid(value) ? value : randomUUID());
const classifyReportIdentifier = (rawId) => {
    const value = String(rawId ?? '').trim();
    if (!value) {
        throw new Error('Invalid report identifier: value is missing.');
    }
    if (isValidUuid(value)) {
        return { value, sqlType: 'uuid' };
    }
    if (/^\d+$/.test(value)) {
        return { value, sqlType: 'bigint' };
    }
    throw new Error(`Invalid report identifier format: ${value}`);
};
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const toDateOnly = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
};

const createEmptyWorkspace = () => ({ projects: [], employees: [] });

const logDebug = (category, ...args) => {
    if (process.env.DEBUG_WORKSPACE === 'true') {
        logger.debug({ category, args });
    }
};
const loadFullWorkspace = async (clientOverride) => {
    const executor = clientOverride ?? pool;

    const employeesResult = await executor.query(`
        SELECT id::text, name, email, COALESCE(location, '') AS location
        FROM employees
        ORDER BY name ASC
    `);

    const employees = employeesResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        location: row.location ?? '',
    }));

    const projectsResult = await executor.query(`
        SELECT id::text, name, start_date, end_date, status, description
        FROM projects
        ORDER BY created_at ASC
    `);

    const projects = projectsResult.rows.map((row) => ({
        id: row.id,
        config: {
            projectName: row.name,
            projectStartDate: toDateOnly(row.start_date) ?? toDateOnly(new Date()),
            projectEndDate: toDateOnly(row.end_date) ?? toDateOnly(new Date()),
        },
        status: row.status,
        description: row.description ?? '',
        projectMembers: [],
        reports: [],
    }));

    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const projectIds = projects.map((project) => project.id);

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
            const report = {
                id: row.id,
                weekKey: row.week_key,
                state: {
                    statusItems: [],
                    challengeItems: [],
                    mainTableRows: [],
                    risks: [],
                    phases: [],
                    milestones: [],
                    deliverables: [],
                    kanbanTasks: [],
                },
            };
            reportMap.set(row.id, report);
            const project = projectMap.get(row.project_id);
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

        const risks = await fetchReportItems(`
            SELECT id::text, report_id::text, name, probability, consequence
            FROM report_risks
            WHERE report_id::text = ANY($1::text[])
            ORDER BY id::uuid ASC
        `);
        risks.forEach((row) => {
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

        const phases = await fetchReportItems(`
            SELECT id::text, report_id::text, label, start_percentage::float, end_percentage::float, highlight
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
                });
            }
        });

        const milestones = await fetchReportItems(`
            SELECT id::text, report_id::text, label, position_percentage::float
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
                });
            }
        });

        const deliverables = await fetchReportItems(`
            SELECT id::text, report_id::text, label, position_percentage::float
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
                });
            }
        });

        const tasks = await fetchReportItems(`
            SELECT id::text, report_id::text, content, status
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

    return { employees, projects };
};
const applyWorkspacePermissions = (workspace, user) => {
    if (!user) {
        return workspace;
    }

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

    return { projects, employees };
};

const ensureEmployeeLinkForUser = async (executor, user) => {
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

const buildWorkspaceForUser = async (user, clientOverride) => {
    const executor = clientOverride ?? pool;
    const effectiveUser = await ensureEmployeeLinkForUser(executor, user);
    const workspace = await loadFullWorkspace(clientOverride);
    return applyWorkspacePermissions(workspace, effectiveUser);
};const getUserEditableProjects = (workspace, user) => {
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

    const existingResult = await client.query('SELECT id::text, email FROM employees');
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

        const existingByIdRow = existingById.get(employeeId);
        const existingByEmailRow = existingByEmail.get(email);
        if (!existingByIdRow && existingByEmailRow) {
            employeeId = existingByEmailRow.id;
        }

        if (user.role !== 'Administrator' && !allowedEmployeeIds.has(employeeId)) {
            continue;
        }

        await client.query(`
            INSERT INTO employees (id, name, email, location)
            VALUES ($1::uuid, $2, LOWER($3), NULLIF($4, ''))
            ON CONFLICT (id)
            DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, location = EXCLUDED.location;
        `, [
            employeeId,
            (employee.name ?? '').trim() || 'Ukendt navn',
            email,
            typeof employee.location === 'string' ? employee.location.trim() : null,
        ]);

        employee.id = employeeId;
        existingById.set(employeeId, { id: employeeId, email });
        existingByEmail.set(email, { id: employeeId, email });
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
const syncReportState = async (client, reportId, state, existingState = null) => {
    const safeState = state ?? {};
    const previousState = existingState ?? {};
    const { value: reportIdValue, sqlType: reportIdSqlType } = classifyReportIdentifier(reportId);
    const reportIdCast = `::${reportIdSqlType}`;

    const resetTables = [
        'report_status_items',
        'report_challenge_items',
        'report_main_table_rows',
        'report_risks',
        'report_phases',
        'report_milestones',
        'report_deliverables',
        'report_kanban_tasks',
    ];

    for (const table of resetTables) {
        await client.query(`DELETE FROM ${table} WHERE report_id = $1${reportIdCast}`, [reportIdValue]);
    }

    const statusUsedIds = new Set((previousState.statusItems ?? []).map((item) => item?.id).filter(Boolean));
    const challengeUsedIds = new Set((previousState.challengeItems ?? []).map((item) => item?.id).filter(Boolean));
    const mainRowUsedIds = new Set((previousState.mainTableRows ?? []).map((item) => item?.id).filter(Boolean));
    const riskUsedIds = new Set((previousState.risks ?? []).map((item) => item?.id).filter(Boolean));
    const phaseUsedIds = new Set((previousState.phases ?? []).map((item) => item?.id).filter(Boolean));
    const milestoneUsedIds = new Set((previousState.milestones ?? []).map((item) => item?.id).filter(Boolean));
    const deliverableUsedIds = new Set((previousState.deliverables ?? []).map((item) => item?.id).filter(Boolean));
    const taskUsedIds = new Set((previousState.kanbanTasks ?? []).map((item) => item?.id).filter(Boolean));

    const ensureFreshId = (candidate, usedSet) => {
        let candidateId = ensureUuid(candidate);
        while (usedSet.has(candidateId)) {
            candidateId = ensureUuid();
        }
        usedSet.add(candidateId);
        return candidateId;
    };

    const hydrateUsedIds = async (tableName, targetSet) => {
        const result = await client.query('SELECT id::text FROM ' + tableName);
        for (const row of result.rows) {
            if (row?.id) {
                targetSet.add(row.id);
            }
        }
    };

    await hydrateUsedIds('report_status_items', statusUsedIds);
    await hydrateUsedIds('report_challenge_items', challengeUsedIds);
    await hydrateUsedIds('report_main_table_rows', mainRowUsedIds);
    await hydrateUsedIds('report_risks', riskUsedIds);
    await hydrateUsedIds('report_phases', phaseUsedIds);
    await hydrateUsedIds('report_milestones', milestoneUsedIds);
    await hydrateUsedIds('report_deliverables', deliverableUsedIds);
    await hydrateUsedIds('report_kanban_tasks', taskUsedIds);

    const insertListItems = async (items, tableName, usedSet) => {
        const list = Array.isArray(items) ? items : [];
        for (let index = 0; index < list.length; index += 1) {
            const item = list[index];
            if (!item) continue;
            let itemId = ensureFreshId(item.id, usedSet);
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
                        itemId = ensureFreshId(null, usedSet);
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

    const mainRows = Array.isArray(safeState.mainTableRows) ? safeState.mainTableRows : [];
    for (let index = 0; index < mainRows.length; index += 1) {
        const row = mainRows[index];
        if (!row) continue;
        let rowId = ensureFreshId(row.id, mainRowUsedIds);
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
                    rowId = ensureFreshId(null, mainRowUsedIds);
                    row.id = rowId;
                    continue;
                }
                throw error;
            }
        }
    }

    const risks = Array.isArray(safeState.risks) ? safeState.risks : [];
    for (const risk of risks) {
        if (!risk) continue;
        let riskId = ensureFreshId(risk.id, riskUsedIds);
        risk.id = riskId;
        const probability = Number.isFinite(risk.s) ? Math.max(1, Math.min(5, Number(risk.s))) : 1;
        const consequence = Number.isFinite(risk.k) ? Math.max(1, Math.min(5, Number(risk.k))) : 1;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await client.query(
                    `
            INSERT INTO report_risks (id, report_id, name, probability, consequence)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4, $5)
        `,
                    [riskId, reportIdValue, risk.name ?? '', probability, consequence],
                );
                break;
            } catch (error) {
                if (error.code === '23505' && attempt < 2) {
                    riskUsedIds.delete(riskId);
                    riskId = ensureFreshId(null, riskUsedIds);
                    risk.id = riskId;
                    continue;
                }
                throw error;
            }
        }
    }

    const phases = Array.isArray(safeState.phases) ? safeState.phases : [];
    for (const phase of phases) {
        if (!phase) continue;
        let phaseId = ensureFreshId(phase.id, phaseUsedIds);
        phase.id = phaseId;
        const start = Number.isFinite(phase.start) ? Math.max(0, Math.min(100, Number(phase.start))) : 0;
        const end = Number.isFinite(phase.end) ? Math.max(0, Math.min(100, Number(phase.end))) : start;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await client.query(
                    `
            INSERT INTO report_phases (id, report_id, label, start_percentage, end_percentage, highlight)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4, $5, $6)
        `,
                    [phaseId, reportIdValue, phase.text ?? '', start, end, phase.highlight ?? 'blue'],
                );
                break;
            } catch (error) {
                if (error.code === '23505' && attempt < 2) {
                    phaseUsedIds.delete(phaseId);
                    phaseId = ensureFreshId(null, phaseUsedIds);
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
        let milestoneId = ensureFreshId(milestone.id, milestoneUsedIds);
        milestone.id = milestoneId;
        const position = Number.isFinite(milestone.position) ? Math.max(0, Math.min(100, Number(milestone.position))) : 0;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await client.query(
                    `
            INSERT INTO report_milestones (id, report_id, label, position_percentage)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4)
        `,
                    [milestoneId, reportIdValue, milestone.text ?? '', position],
                );
                break;
            } catch (error) {
                if (error.code === '23505' && attempt < 2) {
                    milestoneUsedIds.delete(milestoneId);
                    milestoneId = ensureFreshId(null, milestoneUsedIds);
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
        let deliverableId = ensureFreshId(deliverable.id, deliverableUsedIds);
        deliverable.id = deliverableId;
        const position = Number.isFinite(deliverable.position) ? Math.max(0, Math.min(100, Number(deliverable.position))) : 0;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await client.query(
                    `
            INSERT INTO report_deliverables (id, report_id, label, position_percentage)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4)
        `,
                    [deliverableId, reportIdValue, deliverable.text ?? '', position],
                );
                break;
            } catch (error) {
                if (error.code === '23505' && attempt < 2) {
                    deliverableUsedIds.delete(deliverableId);
                    deliverableId = ensureFreshId(null, deliverableUsedIds);
                    deliverable.id = deliverableId;
                    continue;
                }
                throw error;
            }
        }
    }

    const tasks = Array.isArray(safeState.kanbanTasks) ? safeState.kanbanTasks : [];
    for (const task of tasks) {
        if (!task) continue;
        let taskId = ensureFreshId(task.id, taskUsedIds);
        task.id = taskId;
        const status = ['todo', 'doing', 'done'].includes(task.status) ? task.status : 'todo';
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await client.query(
                    `
            INSERT INTO report_kanban_tasks (id, report_id, content, status)
            VALUES ($1::uuid, $2${reportIdCast}, $3, $4)
        `,
                    [taskId, reportIdValue, task.content ?? '', status],
                );
                break;
            } catch (error) {
                if (error.code === '23505' && attempt < 2) {
                    taskUsedIds.delete(taskId);
                    taskId = ensureFreshId(null, taskUsedIds);
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

const syncProjectReports = async (client, projectId, reportsPayload, existingProject = null) => {
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

        await client.query(`
            INSERT INTO projects (id, name, start_date, end_date, status, description)
            VALUES ($1::uuid, $2, $3::date, $4::date, $5, $6)
            ON CONFLICT (id)
            DO UPDATE SET name = EXCLUDED.name, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, status = EXCLUDED.status, description = EXCLUDED.description
        `, [normalisedProjectId, projectName, startDate, endDate, status, description]);

        await syncProjectMembers(client, normalisedProjectId, project.projectMembers, existingProject);
        await syncProjectReports(client, normalisedProjectId, project.reports, existingProject);
    }
};

const persistWorkspace = async (workspaceData, user) => {
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
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'Administrator') {
        return res.status(403).json({ message: 'Forbidden: Administrator access required.' });
    }
    return next();
};

app.get('/api/setup/status', async (req, res, next) => {
    try {
        const result = await pool.query("SELECT COUNT(*)::int AS admin_count FROM users WHERE role = 'Administrator'");
        const needsSetup = (result.rows[0]?.admin_count ?? 0) === 0;
        res.json({ needsSetup });
    } catch (error) {
        logger.error({ err: error }, 'Error checking setup status');
        return next(createAppError('Could not check application setup status.', 500, error));
    }
});

app.post('/api/setup/create-first-user', authRateLimiter, async (req, res, next) => {
    try {
        const result = await pool.query("SELECT COUNT(*)::int AS admin_count FROM users WHERE role = 'Administrator'");
        if ((result.rows[0]?.admin_count ?? 0) > 0) {
            return res.status(403).json({ message: 'An administrator account already exists. Cannot create another.' });
        }

        const { email, name, password } = req.body ?? {};
        if (!email || !name || !password) {
            return res.status(400).json({ message: 'Email, name, and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        const normalizedEmail = normalizeEmail(email);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let employeeId;
            const employeeResult = await client.query(
                'SELECT id::text FROM employees WHERE LOWER(email) = $1',
                [normalizedEmail],
            );

            if (employeeResult.rowCount > 0) {
                employeeId = employeeResult.rows[0].id;
            } else {
                const insertEmployee = await client.query(
                    'INSERT INTO employees (name, email) VALUES ($1, LOWER($2)) RETURNING id::text',
                    [name.trim(), normalizedEmail],
                );
                employeeId = insertEmployee.rows[0].id;
            }

            const passwordHash = await bcrypt.hash(password, 10);
            await client.query(
                'INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ($1, LOWER($2), $3, $4, $5::uuid)',
                [name.trim(), normalizedEmail, passwordHash, 'Administrator', employeeId],
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        res.status(201).json({ success: true, message: 'Administrator account created successfully! You can now log in.' });
    } catch (error) {
        logger.error({ err: error }, 'First user creation error');
        return next(createAppError('An internal server error occurred during initial setup.', 500, error));
    }
});
app.post('/api/login', authRateLimiter, async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return respondValidationError(res, 'Invalid login payload.', parsed.error.issues);
    }

    try {
        const { email, password } = parsed.data;
        const normalizedEmail = normalizeEmail(email);
        const result = await pool.query('SELECT id::text, name, email, role, password_hash, employee_id::text FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
        const user = result.rows[0];
        if (!user) {
            logger.warn({ event: 'login_failed', reason: 'user_not_found' });
            return res.status(401).json({ message: 'Login failed. Please check your email and password.' });
        }

        const isMatch = bcrypt.compareSync(password.trim(), user.password_hash.trim());
        if (!isMatch) {
            logger.warn({ event: 'login_failed', reason: 'password_mismatch', userId: user.id });
            return res.status(401).json({ message: 'Login failed. Please check your email and password.' });
        }

        const enrichedUser = await ensureEmployeeLinkForUser(pool, {
            id: user.id,
            email: user.email,
            name: user.name,
            employeeId: user.employee_id ?? null,
        });

        const userPayload = {
            id: user.id,
            email: enrichedUser?.email ?? user.email,
            name: enrichedUser?.name ?? user.name,
            role: user.role,
            employeeId: enrichedUser?.employeeId ?? null,
        };

        const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token, user: userPayload });
    } catch (error) {
        logger.error({ err: error }, 'Internal server error during login');
        return next(createAppError('An internal server error occurred during login.', 500, error));
    }
});

app.post('/api/register', authRateLimiter, async (req, res, next) => {
    const parsed = registerSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return respondValidationError(res, 'Invalid registration payload.', parsed.error.issues);
    }

    try {
        const { email, name, password } = parsed.data;
        const normalizedEmail = normalizeEmail(email);
        const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
        if (existingUser.rowCount > 0) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const passwordHash = await bcrypt.hash(password, 10);

            let employeeId = null;
            const employeeResult = await client.query('SELECT id::text FROM employees WHERE LOWER(email) = $1', [normalizedEmail]);
            if (employeeResult.rowCount > 0) {
                employeeId = employeeResult.rows[0].id;
            } else {
                const insertEmployee = await client.query(
                    'INSERT INTO employees (name, email) VALUES ($1, LOWER($2)) RETURNING id::text',
                    [name.trim(), normalizedEmail],
                );
                employeeId = insertEmployee.rows[0].id;
            }

            await client.query(
                'INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ($1, LOWER($2), $3, $4, $5::uuid)',
                [name.trim(), normalizedEmail, passwordHash, 'Teammedlem', employeeId],
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        res.status(201).json({ success: true, message: 'User created successfully! You can now log in.' });
    } catch (error) {
        logger.error({ err: error }, 'Registration error');
        return next(createAppError('An internal server error occurred during registration.', 500, error));
    }
});

app.post('/api/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/workspace', authMiddleware, async (req, res, next) => {
    try {
        const enrichedUser = await ensureEmployeeLinkForUser(pool, req.user);
        req.user = enrichedUser;
        const workspace = await buildWorkspaceForUser(enrichedUser);
        res.json(workspace);
    } catch (error) {
        logger.error({ err: error }, 'Get workspace error');
        return next(createAppError('An internal server error occurred while retrieving workspace data.', 500, error));
    }
});

app.post('/api/workspace', authMiddleware, async (req, res) => {
    if (req.user?.role === 'Teammedlem') {
        return res.status(403).json({ message: 'Forbidden: Team members cannot modify workspace data.' });
    }

    const workspaceData = req.body;
    if (!workspaceData || typeof workspaceData.projects === 'undefined' || typeof workspaceData.employees === 'undefined') {
        return res.status(400).json({ message: 'Invalid workspace data format.' });
    }

    try {
        const enrichedUser = await ensureEmployeeLinkForUser(pool, req.user);
        req.user = enrichedUser;
        await persistWorkspace(workspaceData, enrichedUser);
        const workspace = await buildWorkspaceForUser(enrichedUser);
        res.json({ success: true, workspace });
    } catch (error) {
        const statusCode = error.statusCode ?? 500;
        logger.error({ err: error }, 'Save workspace error');
        res.status(statusCode).json({ message: statusCode === 403 ? 'Forbidden: Insufficient permissions.' : 'An internal server error occurred while saving workspace data.' });
    }
});
app.post('/api/projects/:projectId/time-entries', authMiddleware, async (req, res, next) => {
    const parsedParams = timeEntryParamsSchema.safeParse(req.params ?? {});
    if (!parsedParams.success) {
        return respondValidationError(res, 'Invalid time entry parameters.', parsedParams.error.issues);
    }
    const parsedBody = timeEntryBodySchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
        return respondValidationError(res, 'Invalid time entry payload.', parsedBody.error.issues);
    }

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { projectId } = parsedParams.data;
            const { memberId, weekKey, plannedHours, actualHours } = parsedBody.data;

            const memberResult = await client.query(
                `
                SELECT id::text, project_id::text, employee_id::text, role, member_group, is_project_lead
                FROM project_members
                WHERE id = $1::uuid
            `,
                [memberId],
            );

            if (memberResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Project member not found.' });
            }

            const memberRow = memberResult.rows[0];
            if (memberRow.project_id !== projectId) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Member does not belong to the specified project.' });
            }

            const effectiveUser = await ensureEmployeeLinkForUser(client, req.user);
            const userRole = effectiveUser.role;
            const userEmployeeId = effectiveUser.employeeId ?? null;

            if (userRole === 'Teammedlem') {
                if (!userEmployeeId || memberRow.employee_id !== userEmployeeId) {
                    await client.query('ROLLBACK');
                    return res.status(403).json({ message: 'Forbidden: You are not assigned to this project.' });
                }
                if (actualHours === undefined) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: 'actualHours is required for team members and must be a non-negative number.',
                    });
                }
                await client.query(
                    `
                    INSERT INTO project_member_time_entries (project_member_id, week_key, planned_hours, actual_hours)
                    VALUES ($1::uuid, $2, 0, $3)
                    ON CONFLICT (project_member_id, week_key)
                    DO UPDATE SET actual_hours = EXCLUDED.actual_hours
                `,
                    [memberId, weekKey, actualHours],
                );
            } else {
                if (userRole === 'Projektleder') {
                    if (!userEmployeeId) {
                        await client.query('ROLLBACK');
                        return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
                    }
                    const leadResult = await client.query(
                        `
                        SELECT 1
                        FROM project_members
                        WHERE project_id = $1::uuid AND employee_id = $2::uuid AND is_project_lead = true
                        LIMIT 1
                    `,
                        [projectId, userEmployeeId],
                    );
                    if (leadResult.rowCount === 0) {
                        await client.query('ROLLBACK');
                        return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
                    }
                }
                const planned = plannedHours ?? 0;
                const actual = actualHours ?? 0;
                await client.query(
                    `
                    INSERT INTO project_member_time_entries (project_member_id, week_key, planned_hours, actual_hours)
                    VALUES ($1::uuid, $2, $3, $4)
                    ON CONFLICT (project_member_id, week_key)
                    DO UPDATE SET planned_hours = EXCLUDED.planned_hours, actual_hours = EXCLUDED.actual_hours
                `,
                    [memberId, weekKey, planned, actual],
                );
            }

            const updatedEntriesResult = await client.query(
                `
                SELECT week_key, planned_hours::float, actual_hours::float
                FROM project_member_time_entries
                WHERE project_member_id = $1::uuid
                ORDER BY week_key ASC
            `,
                [memberId],
            );

            await client.query('COMMIT');

            const updatedMember = {
                id: memberRow.id,
                employeeId: memberRow.employee_id,
                role: memberRow.role,
                group: memberRow.member_group,
                isProjectLead: memberRow.is_project_lead,
                timeEntries: updatedEntriesResult.rows.map((row) => ({
                    weekKey: row.week_key,
                    plannedHours: Number(row.planned_hours ?? 0),
                    actualHours: Number(row.actual_hours ?? 0),
                })),
            };

            res.json({ success: true, member: updatedMember });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error({ err: error }, 'Time entry update error');
        return next(createAppError('An internal server error occurred while updating time entries.', 500, error));
    }
});
app.get('/api/users', authMiddleware, adminOnly, async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id::text, name, email, role FROM users ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        logger.error({ err: error }, 'Get users error');
        return next(createAppError('An internal server error occurred while retrieving users.', 500, error));
    }
});

app.put('/api/users/:id/role', authMiddleware, adminOnly, async (req, res, next) => {
    const { id } = req.params;
    const { role } = req.body ?? {};

    if (!['Administrator', 'Projektleder', 'Teammedlem'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified.' });
    }

    if (String(req.user.id) === String(id) && req.user.role === 'Administrator' && role !== 'Administrator') {
        return res.status(403).json({ message: 'Forbidden: Administrators cannot change their own role.' });
    }

    try {
        const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2::uuid RETURNING id', [role, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ success: true, message: 'User role updated.' });
    } catch (error) {
        logger.error({ err: error }, 'Update role error');
        return next(createAppError('An internal server error occurred while updating the user role.', 500, error));
    }
});

// Centralized error handler
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const status = err.status ?? err.statusCode ?? 500;
    const message =
        err.userMessage ??
        (status < 500 && err.message ? err.message : 'An internal server error occurred.');

    if (status >= 500) {
        logger.error({ err }, 'Unhandled application error');
    }

    res.status(status).json({
        success: false,
        message,
    });
});

app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Backend server is running');
});












