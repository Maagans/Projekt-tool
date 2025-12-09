/**
 * Workspace Repository
 * Extracted from workspaceService.js - contains database queries for workspace data loading
 */

import { toDateOnly, toNonNegativeCapacity } from '../utils/helpers.js';
import pool from '../db.js';

export const WORKSPACE_SETTINGS_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Load workspace settings
 */
export const loadSettings = async (executor = pool) => {
    const result = await executor.query(
        `
    SELECT COALESCE(pmo_baseline_hours_week, 0)::float AS baseline
    FROM workspace_settings
    WHERE id = $1::uuid
    LIMIT 1
    `,
        [WORKSPACE_SETTINGS_SINGLETON_ID],
    );
    const row = result.rows?.[0] ?? null;
    return {
        pmoBaselineHoursWeek: toNonNegativeCapacity(row?.baseline ?? 0),
    };
};

/**
 * Load all employees
 */
export const loadEmployees = async (executor = pool) => {
    const result = await executor.query(`
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
    return result.rows;
};

/**
 * Load all projects (basic info)
 */
export const loadProjects = async (executor = pool) => {
    const result = await executor.query(`
    SELECT
      id::text,
      name,
      start_date,
      end_date,
      status,
      description,
      project_goal,
      business_case,
      total_budget,
      hero_image_url
    FROM projects
    ORDER BY created_at ASC
  `);
    return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        startDate: toDateOnly(row.start_date),
        endDate: toDateOnly(row.end_date),
        status: row.status,
        description: row.description ?? '',
        projectGoal: row.project_goal ?? '',
        businessCase: row.business_case ?? '',
        totalBudget: row.total_budget !== null ? Number(row.total_budget) : null,
        heroImageUrl: row.hero_image_url ?? null,
    }));
};

/**
 * Load workstreams for given project IDs
 */
export const loadWorkstreams = async (executor, projectIds) => {
    if (!projectIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, project_id::text, name, sort_order::int
    FROM project_workstreams
    WHERE project_id = ANY($1::uuid[])
    ORDER BY sort_order ASC, name ASC
    `,
        [projectIds],
    );
    return result.rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        order: Number(row.sort_order ?? 0),
    }));
};

/**
 * Load project members for given project IDs
 */
export const loadProjectMembers = async (executor, projectIds) => {
    if (!projectIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, project_id::text, employee_id::text, role, member_group, is_project_lead
    FROM project_members
    WHERE project_id = ANY($1::uuid[])
    ORDER BY member_group, role, id::uuid
    `,
        [projectIds],
    );
    return result.rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        employeeId: row.employee_id,
        role: row.role,
        group: row.member_group,
        isProjectLead: row.is_project_lead,
    }));
};

/**
 * Load time entries for given member IDs
 */
export const loadTimeEntries = async (executor, memberIds) => {
    if (!memberIds.length) return [];
    const result = await executor.query(
        `
    SELECT project_member_id::text AS member_id, week_key, planned_hours::float, actual_hours::float
    FROM project_member_time_entries
    WHERE project_member_id = ANY($1::uuid[])
    `,
        [memberIds],
    );
    return result.rows.map((row) => ({
        memberId: row.member_id,
        weekKey: row.week_key,
        plannedHours: Number(row.planned_hours ?? 0),
        actualHours: Number(row.actual_hours ?? 0),
    }));
};

/**
 * Load reports for given project IDs
 */
export const loadReports = async (executor, projectIds) => {
    if (!projectIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, project_id::text, week_key
    FROM reports
    WHERE project_id = ANY($1::uuid[])
    ORDER BY week_key DESC
    `,
        [projectIds],
    );
    return result.rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        weekKey: row.week_key,
    }));
};

/**
 * Load report items (status, challenge, next steps, etc.)
 */
export const loadReportStatusItems = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, report_id::text, position, content
    FROM report_status_items
    WHERE report_id::text = ANY($1::text[])
    ORDER BY position ASC, id::uuid ASC
    `,
        [reportIds],
    );
    return result.rows;
};

export const loadReportChallengeItems = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, report_id::text, position, content
    FROM report_challenge_items
    WHERE report_id::text = ANY($1::text[])
    ORDER BY position ASC, id::uuid ASC
    `,
        [reportIds],
    );
    return result.rows;
};

export const loadReportNextStepItems = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, report_id::text, position, content
    FROM report_next_step_items
    WHERE report_id::text = ANY($1::text[])
    ORDER BY position ASC, id::uuid ASC
    `,
        [reportIds],
    );
    return result.rows;
};

export const loadReportMainTableRows = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, report_id::text, title, status, note
    FROM report_main_table_rows
    WHERE report_id::text = ANY($1::text[])
    ORDER BY id::uuid ASC
    `,
        [reportIds],
    );
    return result.rows;
};

export const loadReportPhases = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, report_id::text, text, start_pct, end_pct, highlight, workstream_id, start_date, end_date, status
    FROM report_phases
    WHERE report_id::text = ANY($1::text[])
    ORDER BY id::uuid ASC
    `,
        [reportIds],
    );
    return result.rows;
};

export const loadReportMilestones = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, report_id::text, text, position, date, status, workstream_id
    FROM report_milestones
    WHERE report_id::text = ANY($1::text[])
    ORDER BY position ASC, id::uuid ASC
    `,
        [reportIds],
    );
    return result.rows;
};

export const loadReportDeliverables = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT
      id::text, report_id::text, text, position, milestone_id, status,
      owner, owner_id, description, notes, start_date, end_date, progress
    FROM report_deliverables
    WHERE report_id::text = ANY($1::text[])
    ORDER BY position ASC, id::uuid ASC
    `,
        [reportIds],
    );
    return result.rows;
};

export const loadReportDeliverableChecklists = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, deliverable_id::text, text, completed, sort_order::int
    FROM report_deliverable_checklist_items
    WHERE deliverable_id IN (
      SELECT id FROM report_deliverables WHERE report_id::text = ANY($1::text[])
    )
    ORDER BY sort_order ASC, id::uuid ASC
    `,
        [reportIds],
    );
    return result.rows;
};

export const loadReportKanbanTasks = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT id::text, report_id::text, content, status, assignee, due_date, notes, created_at
    FROM report_kanban_tasks
    WHERE report_id::text = ANY($1::text[])
    ORDER BY created_at ASC, id::uuid ASC
    `,
        [reportIds],
    );
    return result.rows;
};

export const loadReportRisks = async (executor, reportIds) => {
    if (!reportIds.length) return [];
    const result = await executor.query(
        `
    SELECT
      rs.id::text AS snapshot_id,
      rs.report_id::text,
      rs.probability::int,
      rs.impact::int,
      rs.created_at,
      pr.id::text AS project_risk_id,
      pr.title,
      pr.description,
      pr.category,
      pr.status,
      pr.mitigation_plan_a,
      pr.mitigation_plan_b,
      pr.follow_up_notes,
      pr.follow_up_frequency,
      pr.due_date,
      pr.last_follow_up_at,
      pr.is_archived,
      pr.updated_at AS project_risk_updated_at,
      e.id::text AS owner_id,
      e.name AS owner_name,
      e.email AS owner_email
    FROM report_risk_snapshots rs
    JOIN project_risks pr ON rs.project_risk_id = pr.id
    LEFT JOIN employees e ON pr.owner_id = e.id
    WHERE rs.report_id::text = ANY($1::text[])
    ORDER BY (rs.probability * rs.impact) DESC, rs.created_at ASC
    `,
        [reportIds],
    );
    return result.rows;
};

/**
 * Update workspace settings
 */
export const updateSettings = async (executor, settings) => {
    const { pmoBaselineHoursWeek } = settings;
    await executor.query(
        `
    INSERT INTO workspace_settings (id, pmo_baseline_hours_week)
    VALUES ($1::uuid, $2)
    ON CONFLICT (id) DO UPDATE SET pmo_baseline_hours_week = EXCLUDED.pmo_baseline_hours_week
    `,
        [WORKSPACE_SETTINGS_SINGLETON_ID, toNonNegativeCapacity(pmoBaselineHoursWeek ?? 0)],
    );
};
