/**
 * Load Workspace Service
 * Extracted from workspaceService.js - handles workspace data loading using repository layer
 */

import pool from '../../db.js';
import { ensureUuid, toDateOnly } from '../../utils/helpers.js';
import * as workspaceRepository from '../../repositories/workspaceRepository.js';
import { resolveDepartmentLocation } from '../workspaceService.js';

/**
 * Clone workstreams for report state initialization
 */
const cloneWorkstreamsForState = (streams = []) =>
    (Array.isArray(streams) ? streams : []).map((stream, index) => ({
        id: stream?.id ?? ensureUuid(),
        name: stream?.name ?? `Workstream ${index + 1}`,
        order: typeof stream?.order === 'number' ? stream.order : index,
    }));

/**
 * Convert ISO date to consistent format
 */
const toIsoString = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    try {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) {
            return toDateOnly(d);
        }
    } catch {
        // ignore parse errors
    }
    return null;
};

/**
 * Load complete workspace data from database
 * Uses repository layer for all database queries
 */
export const loadFullWorkspace = async (clientOverride) => {
    const executor = clientOverride ?? pool;

    // Load settings
    const settings = await workspaceRepository.loadSettings(executor);

    // Load and map employees
    const employeeRows = await workspaceRepository.loadEmployees(executor);
    const employees = employeeRows.map((row) => {
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

    // Load projects
    const projectRows = await workspaceRepository.loadProjects(executor);
    const projects = projectRows.map((row) => ({
        id: row.id,
        config: {
            projectName: row.name,
            projectStartDate: row.startDate ?? toDateOnly(new Date()),
            projectEndDate: row.endDate ?? toDateOnly(new Date()),
            projectGoal: row.projectGoal,
            businessCase: row.businessCase,
            totalBudget: row.totalBudget,
            heroImageUrl: row.heroImageUrl,
        },
        status: row.status,
        description: row.description,
        projectMembers: [],
        reports: [],
        workstreams: [],
    }));

    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const projectIds = projects.map((p) => p.id);

    // Load and attach workstreams
    if (projectIds.length > 0) {
        const workstreams = await workspaceRepository.loadWorkstreams(executor, projectIds);
        for (const ws of workstreams) {
            const project = projectMap.get(ws.projectId);
            if (project) {
                project.workstreams.push({
                    id: ws.id,
                    name: ws.name,
                    order: ws.order,
                });
            }
        }
        // Sort workstreams by order
        for (const project of projects) {
            project.workstreams = project.workstreams
                .sort((a, b) => a.order - b.order)
                .map((s, i) => ({ ...s, order: i }));
        }
    }

    // Load project members
    const memberMap = new Map();
    if (projectIds.length > 0) {
        const members = await workspaceRepository.loadProjectMembers(executor, projectIds);
        for (const m of members) {
            const member = {
                id: m.id,
                employeeId: m.employeeId,
                role: m.role,
                group: m.group,
                isProjectLead: m.isProjectLead,
                timeEntries: [],
            };
            memberMap.set(m.id, member);
            const project = projectMap.get(m.projectId);
            if (project) {
                project.projectMembers.push(member);
            }
        }
    }

    // Load time entries
    if (memberMap.size > 0) {
        const memberIds = Array.from(memberMap.keys());
        const entries = await workspaceRepository.loadTimeEntries(executor, memberIds);
        for (const e of entries) {
            const member = memberMap.get(e.memberId);
            if (member) {
                member.timeEntries.push({
                    weekKey: e.weekKey,
                    plannedHours: e.plannedHours,
                    actualHours: e.actualHours,
                });
            }
        }
        // Sort time entries
        for (const member of memberMap.values()) {
            member.timeEntries.sort((a, b) => a.weekKey.localeCompare(b.weekKey));
        }
    }

    // Load reports
    const reportMap = new Map();
    if (projectIds.length > 0) {
        const reportRows = await workspaceRepository.loadReports(executor, projectIds);
        for (const r of reportRows) {
            const project = projectMap.get(r.projectId);
            const report = {
                id: r.id,
                weekKey: r.weekKey,
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
            reportMap.set(r.id, report);
            if (project) {
                project.reports.push(report);
            }
        }
    }

    // Load report items
    const reportIds = Array.from(reportMap.keys());
    if (reportIds.length > 0) {
        // Load all report items in parallel
        const [
            statusItems,
            challengeItems,
            nextStepItems,
            mainTableRows,
            phases,
            milestones,
            deliverables,
            checklistItems,
            kanbanTasks,
            risks,
        ] = await Promise.all([
            workspaceRepository.loadReportStatusItems(executor, reportIds),
            workspaceRepository.loadReportChallengeItems(executor, reportIds),
            workspaceRepository.loadReportNextStepItems(executor, reportIds),
            workspaceRepository.loadReportMainTableRows(executor, reportIds),
            workspaceRepository.loadReportPhases(executor, reportIds),
            workspaceRepository.loadReportMilestones(executor, reportIds),
            workspaceRepository.loadReportDeliverables(executor, reportIds),
            workspaceRepository.loadReportDeliverableChecklists(executor, reportIds),
            workspaceRepository.loadReportKanbanTasks(executor, reportIds),
            workspaceRepository.loadReportRisks(executor, reportIds),
        ]);

        // Map status items
        for (const row of statusItems) {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.statusItems.push({ id: row.id, content: row.content ?? '' });
            }
        }

        // Map challenge items
        for (const row of challengeItems) {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.challengeItems.push({ id: row.id, content: row.content ?? '' });
            }
        }

        // Map next step items
        for (const row of nextStepItems) {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.nextStepItems.push({ id: row.id, content: row.content ?? '' });
            }
        }

        // Map main table rows
        for (const row of mainTableRows) {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.mainTableRows.push({
                    id: row.id,
                    title: row.title ?? '',
                    status: row.status ?? 'green',
                    note: row.note ?? '',
                });
            }
        }

        // Map phases
        for (const row of phases) {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.phases.push({
                    id: row.id,
                    text: row.text ?? '',
                    startPct: row.start_pct ?? 0,
                    endPct: row.end_pct ?? 0,
                    highlight: row.highlight ?? false,
                    workstreamId: row.workstream_id ?? null,
                    startDate: toIsoString(row.start_date),
                    endDate: toIsoString(row.end_date),
                    status: row.status ?? 'Planned',
                });
            }
        }

        // Map milestones
        for (const row of milestones) {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.milestones.push({
                    id: row.id,
                    text: row.text ?? '',
                    position: row.position ?? 0,
                    date: toIsoString(row.date),
                    status: row.status ?? 'Pending',
                    workstreamId: row.workstream_id ?? null,
                });
            }
        }

        // Build checklist map
        const checklistMap = new Map();
        for (const row of checklistItems) {
            if (!checklistMap.has(row.deliverable_id)) {
                checklistMap.set(row.deliverable_id, []);
            }
            checklistMap.get(row.deliverable_id).push({
                id: row.id,
                text: row.text ?? '',
                completed: row.completed ?? false,
                order: row.sort_order ?? 0,
            });
        }

        // Map deliverables
        for (const row of deliverables) {
            const report = reportMap.get(row.report_id);
            if (report) {
                const checklist = checklistMap.get(row.id) ?? [];
                checklist.sort((a, b) => a.order - b.order);
                report.state.deliverables.push({
                    id: row.id,
                    text: row.text ?? '',
                    position: row.position ?? 0,
                    milestoneId: row.milestone_id ?? null,
                    status: row.status ?? 'Pending',
                    owner: row.owner ?? null,
                    ownerId: row.owner_id ?? null,
                    description: row.description ?? null,
                    notes: row.notes ?? null,
                    startDate: toIsoString(row.start_date),
                    endDate: toIsoString(row.end_date),
                    progress: row.progress ?? 0,
                    checklist,
                });
            }
        }

        // Map kanban tasks
        for (const row of kanbanTasks) {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.kanbanTasks.push({
                    id: row.id,
                    content: row.content ?? '',
                    status: row.status ?? 'todo',
                    assignee: row.assignee ?? null,
                    dueDate: toIsoString(row.due_date),
                    notes: row.notes ?? null,
                });
            }
        }

        // Map risks
        for (const row of risks) {
            const report = reportMap.get(row.report_id);
            if (report) {
                report.state.risks.push({
                    id: row.project_risk_id,
                    snapshotId: row.snapshot_id,
                    title: row.title ?? '',
                    description: row.description ?? '',
                    category: row.category ?? null,
                    status: row.status ?? 'open',
                    owner: row.owner_name ?? null,
                    ownerId: row.owner_id ?? null,
                    probability: row.probability ?? 3,
                    impact: row.impact ?? 3,
                    mitigationPlanA: row.mitigation_plan_a ?? null,
                    mitigationPlanB: row.mitigation_plan_b ?? null,
                    followUpNotes: row.follow_up_notes ?? null,
                    followUpFrequency: row.follow_up_frequency ?? null,
                    dueDate: toIsoString(row.due_date),
                    lastFollowUpAt: toIsoString(row.last_follow_up_at),
                    isArchived: row.is_archived ?? false,
                });
            }
        }
    }

    return { settings, employees, projects };
};
