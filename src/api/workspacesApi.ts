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
    const response = await fetchWithAuth('/workspaces');
    return response as Workspace[];
};

/**
 * Fetch workspace by ID
 */
export const getWorkspaceById = async (id: string): Promise<Workspace> => {
    const response = await fetchWithAuth(`/workspaces/${id}`);
    return response as Workspace;
};

/**
 * Fetch current user's workspace
 */
export const getCurrentWorkspace = async (): Promise<Workspace> => {
    const response = await fetchWithAuth('/workspaces/current/info');
    return response as Workspace;
};

export const workspacesApi = {
    getWorkspaces,
    getWorkspaceById,
    getCurrentWorkspace,
};
