import pool from '../../db.js';
import { createAppError } from '../../utils/errors.js';
import { ensureEmployeeLinkForUser } from '../workspaceService.js';
import { isAdmin } from '../../utils/permissions.js';
import {
  listPlanByProject,
  upsertPhase,
  deletePhasesNotIn,
  upsertMilestone,
  deleteMilestonesNotIn,
  upsertDeliverable,
  deleteDeliverablesNotIn,
  replaceChecklistForDeliverable,
} from '../../repositories/projectPlanRepository.js';

const assertAuthenticated = (user) => {
  if (!user) throw createAppError('Authentication required.', 401);
};

const ensureProjectExists = async (client, projectId) => {
  const res = await client.query(
    'SELECT id::text, start_date, end_date FROM projects WHERE id = $1::uuid LIMIT 1',
    [projectId],
  );
  if (res.rowCount === 0) {
    throw createAppError('Project not found.', 404);
  }
  const row = res.rows[0];
  return {
    id: row.id,
    startDate: row.start_date ? row.start_date.toISOString().split('T')[0] : null,
    endDate: row.end_date ? row.end_date.toISOString().split('T')[0] : null,
  };
};

const assertProjectReadAccess = async (client, projectId, user) => {
  assertAuthenticated(user);
  if (isAdmin(user)) return;
  const employeeId = user.employeeId ?? null;
  if (!employeeId) {
    throw createAppError('Forbidden: Missing employee link.', 403);
  }
  const memberResult = await client.query(
    `
      SELECT 1
      FROM project_members
      WHERE project_id = $1::uuid AND employee_id = $2::uuid
      LIMIT 1
    `,
    [projectId, employeeId],
  );
  if (memberResult.rowCount === 0) {
    throw createAppError('Forbidden: Project membership required.', 403);
  }
};

export const getProjectPlanSnapshot = async (projectId, user) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    const projectMeta = await ensureProjectExists(client, projectId);
    await assertProjectReadAccess(client, projectId, effectiveUser);
    const { phases, milestones, deliverables } = await listPlanByProject(client, projectId);
    await client.query('COMMIT');
    return {
      projectId,
      generatedAt: new Date().toISOString(),
      startDate: projectMeta.startDate,
      endDate: projectMeta.endDate,
      phases,
      milestones,
      deliverables,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const replaceProjectPlan = async (projectId, payload, user) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    await ensureProjectExists(client, projectId);
    await assertProjectReadAccess(client, projectId, effectiveUser); // TODO: tighten to edit access if needed

    const phases = Array.isArray(payload?.phases) ? payload.phases : [];
    const milestones = Array.isArray(payload?.milestones) ? payload.milestones : [];
    const deliverables = Array.isArray(payload?.deliverables) ? payload.deliverables : [];

    const phaseIds = [];
    for (const [index, phase] of phases.entries()) {
      const id = await upsertPhase(client, {
        ...phase,
        id: phase.id,
        projectId,
        sortOrder: typeof phase.sortOrder === 'number' ? phase.sortOrder : index,
      });
      phaseIds.push(id);
    }
    await deletePhasesNotIn(client, projectId, phaseIds);

    const milestoneIds = [];
    for (const milestone of milestones) {
      const id = await upsertMilestone(client, { ...milestone, projectId });
      milestoneIds.push(id);
    }
    await deleteMilestonesNotIn(client, projectId, milestoneIds);

    const deliverableIds = [];
    for (const deliverable of deliverables) {
      const id = await upsertDeliverable(client, { ...deliverable, projectId });
      deliverableIds.push(id);
      await replaceChecklistForDeliverable(client, id, deliverable.checklist ?? []);
    }
    await deleteDeliverablesNotIn(client, projectId, deliverableIds);

    await client.query('COMMIT');
    const { phases: updatedPhases, milestones: updatedMilestones, deliverables: updatedDeliverables } = await listPlanByProject(client, projectId);
    return { projectId, phases: updatedPhases, milestones: updatedMilestones, deliverables: updatedDeliverables };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
