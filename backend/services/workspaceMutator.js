import { randomUUID } from 'crypto';
import pool from '../db.js';
import {
  buildWorkspaceForUser,
  ensureEmployeeLinkForUser,
  persistWorkspace,
} from './workspaceService.js';

const cloneWorkspace = (workspace) => JSON.parse(JSON.stringify(workspace));

export const mutateWorkspace = async (user, mutator) => {
  if (!user) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }

  const enrichedUser = await ensureEmployeeLinkForUser(pool, user);
  const currentWorkspace = await buildWorkspaceForUser(enrichedUser);
  const draftWorkspace = cloneWorkspace(currentWorkspace);

  const mutationResult = await mutator(draftWorkspace, currentWorkspace, {
    randomUUID,
  });

  await persistWorkspace(draftWorkspace, enrichedUser);

  const updatedWorkspace = await buildWorkspaceForUser(enrichedUser);

  return {
    workspace: updatedWorkspace,
    result: mutationResult,
  };
};
