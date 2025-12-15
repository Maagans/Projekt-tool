import logger from "../../logger.js";
import { createAppError } from "../../utils/errors.js";
import { ensureEmployeeLinkForUser } from "../workspaceService.js";
import { withTransaction } from "../../utils/transactions.js";
import { clearResourceAnalyticsCache } from "../resourceAnalyticsService.js";
import {
  findMemberById,
  getTimeEntryForWeek,
  isProjectLeadForEmployee,
  listTimeEntriesForMember,
  upsertTimeEntry,
} from "../../repositories/timeEntryRepository.js";
import { logAction } from "../auditLogService.js";

const normaliseHours = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof fallback === 'number' && Number.isFinite(fallback) && fallback >= 0) {
    return fallback;
  }
  return 0;
};

export const updateProjectTimeEntries = async ({ projectId, memberId, weekKey, plannedHours, actualHours }, user) => {
  try {
    return await withTransaction(async (client) => {
      const member = await findMemberById(client, memberId);
      if (!member) {
        throw createAppError('Project member not found.', 404);
      }
      if (member.project_id !== projectId) {
        throw createAppError('Member does not belong to the specified project.', 400);
      }

      const existingEntry = await getTimeEntryForWeek(client, memberId, weekKey);
      const effectiveUser = await ensureEmployeeLinkForUser(client, user);
      const userRole = effectiveUser.role;
      const userEmployeeId = effectiveUser.employeeId ?? null;

      if (userRole === 'Teammedlem') {
        if (!userEmployeeId || member.employee_id !== userEmployeeId) {
          throw createAppError('Forbidden: You are not assigned to this project.', 403);
        }
        if (actualHours === undefined) {
          throw createAppError('actualHours is required for team members and must be a non-negative number.', 400);
        }

        await upsertTimeEntry(client, {
          memberId,
          weekKey,
          plannedHours: normaliseHours(existingEntry?.plannedHours ?? 0),
          actualHours: normaliseHours(actualHours),
        });
      } else {
        if (userRole === 'Projektleder') {
          const isLead = await isProjectLeadForEmployee(client, projectId, userEmployeeId);
          if (!isLead) {
            throw createAppError('Forbidden: Insufficient permissions.', 403);
          }
        }

        await upsertTimeEntry(client, {
          memberId,
          weekKey,
          plannedHours: normaliseHours(plannedHours, existingEntry?.plannedHours ?? 0),
          actualHours: normaliseHours(actualHours, existingEntry?.actualHours ?? 0),
        });
      }

      // Log time entry update
      await logAction(client, {
        userId: effectiveUser.id,
        userName: effectiveUser.name,
        userRole: effectiveUser.role,
        workspaceId: effectiveUser.workspaceId,
        action: 'UPDATE',
        entityType: 'timeEntry',
        entityId: memberId,
        entityName: weekKey,
        description: `Opdaterede timeregistrering for uge ${weekKey}`,
        ipAddress: null
      });

      // Clear analytics cache so charts update immediately
      clearResourceAnalyticsCache();

      const timeEntries = await listTimeEntriesForMember(client, memberId);

      return {
        success: true,
        member: {
          id: member.id,
          employeeId: member.employee_id,
          role: member.role,
          group: member.member_group,
          isProjectLead: member.is_project_lead,
          timeEntries,
        },
      };
    });
  } catch (error) {
    logger.error({ err: error }, 'Time entry update error');
    throw error;
  }
};

