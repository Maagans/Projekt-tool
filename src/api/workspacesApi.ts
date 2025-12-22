/**
 * Workspaces API
 * Frontend API functions for workspace management
 */

import { fetchWithAuth } from './client';

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
    if (Array.isArray(response)) {
        return response as Workspace[];
    }
    if (response && typeof response === 'object' && 'workspaces' in response) {
        const nested = (response as { workspaces?: Workspace[] }).workspaces;
        if (Array.isArray(nested)) {
            return nested;
        }
    }
    return [];
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
    if (response && typeof response === 'object' && 'workspace' in response) {
        return (response as { workspace: Workspace }).workspace;
    }
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

