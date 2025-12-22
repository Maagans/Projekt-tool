/**
 * Workspaces API
 * Frontend API functions for workspace management
 */

import { fetchWithAuth } from '../api';

export interface Workspace {
    id: string;
    name: string;
    type: 'sekretariat' | 'behandling';
    config: {
        timeMode?: 'monthly' | 'weekly';
        [key: string]: unknown;
    };
    isActive: boolean;
}

/**
 * Fetch all active workspaces
 */
export const getWorkspaces = async (): Promise<Workspace[]> => {
    const response = await fetchWithAuth('/api/workspaces');
    return response as Workspace[];
};

/**
 * Fetch workspace by ID
 */
export const getWorkspaceById = async (id: string): Promise<Workspace> => {
    const response = await fetchWithAuth(`/api/workspaces/${id}`);
    return response as Workspace;
};

/**
 * Fetch current user's workspace
 */
export const getCurrentWorkspace = async (): Promise<Workspace> => {
    const response = await fetchWithAuth('/api/workspaces/current/info');
    return response as Workspace;
};

/**
 * Switch to a different workspace
 * Updates user's workspace in DB and re-issues JWT with new workspaceId
 */
export const switchWorkspace = async (workspaceId: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetchWithAuth('/api/switch-workspace', {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
    });
    return response as { success: boolean; message: string };
};

export const workspacesApi = {
    getWorkspaces,
    getWorkspaceById,
    getCurrentWorkspace,
    switchWorkspace,
};

