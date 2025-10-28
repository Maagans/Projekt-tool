import logger from "../logger.js";
import { createAppError } from "../utils/errors.js";
import { ensureEmployeeLinkForUser } from "./workspaceService.js";
import { withTransaction } from "../utils/transactions.js";

export const updateProjectTimeEntries = async ({ projectId, memberId, weekKey, plannedHours, actualHours }, user) => {
    try {
        return await withTransaction(async (client) => {
            const existingEntryResult = await client.query(
                `
                    SELECT planned_hours::float AS planned_hours, actual_hours::float AS actual_hours
                    FROM project_member_time_entries
                    WHERE project_member_id = $1::uuid AND week_key = $2
                    LIMIT 1
                `,
                [memberId, weekKey],
            );

            const existingEntry = existingEntryResult.rows[0] ?? null;

            const normaliseHours = (value, fallback = 0) => {
                if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
                    return value;
                }
                if (typeof fallback === 'number' && Number.isFinite(fallback) && fallback >= 0) {
                    return fallback;
                }
                return 0;
            };

            const memberResult = await client.query(
                `
                    SELECT id::text, project_id::text, employee_id::text, role, member_group, is_project_lead
                    FROM project_members
                    WHERE id = $1::uuid
                `,
                [memberId],
            );

            if (memberResult.rowCount === 0) {
                throw createAppError('Project member not found.', 404);
            }

            const memberRow = memberResult.rows[0];
            if (memberRow.project_id !== projectId) {
                throw createAppError('Member does not belong to the specified project.', 400);
            }

            const effectiveUser = await ensureEmployeeLinkForUser(client, user);
            const userRole = effectiveUser.role;
            const userEmployeeId = effectiveUser.employeeId ?? null;

            if (userRole === 'Teammedlem') {
                if (!userEmployeeId || memberRow.employee_id !== userEmployeeId) {
                    throw createAppError('Forbidden: You are not assigned to this project.', 403);
                }
                if (actualHours === undefined) {
                    throw createAppError('actualHours is required for team members and must be a non-negative number.', 400);
                }
                await client.query(
                    `
                        INSERT INTO project_member_time_entries (project_member_id, week_key, planned_hours, actual_hours)
                        VALUES ($1::uuid, $2, $3, $4)
                        ON CONFLICT (project_member_id, week_key)
                        DO UPDATE SET planned_hours = EXCLUDED.planned_hours, actual_hours = EXCLUDED.actual_hours
                    `,
                    [memberId, weekKey, normaliseHours(existingEntry?.planned_hours ?? 0), normaliseHours(actualHours)],
                );
            } else {
                if (userRole === 'Projektleder') {
                    if (!userEmployeeId) {
                        throw createAppError('Forbidden: Insufficient permissions.', 403);
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
                        throw createAppError('Forbidden: Insufficient permissions.', 403);
                    }
                }
                const planned = normaliseHours(plannedHours, existingEntry?.planned_hours ?? 0);
                const actual = normaliseHours(actualHours, existingEntry?.actual_hours ?? 0);
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

            return {
                success: true,
                member: {
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
                },
            };
        });
    } catch (error) {
        logger.error({ err: error }, 'Time entry update error');
        throw error;
    }
};
