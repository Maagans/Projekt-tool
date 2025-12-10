// src/api/workspaceApi.ts
// Workspace data and settings
import type { WorkspaceData, WorkspaceSettings } from '../types';
import { fetchWithAuth } from './client';

export const workspaceApi = {
    async getWorkspace(): Promise<WorkspaceData> {
        return fetchWithAuth('/api/workspace');
    },

    async updateWorkspaceSettings(settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
        const response = await fetchWithAuth('/api/workspace/settings', {
            method: 'PATCH',
            body: JSON.stringify(settings),
        });
        return (response as { settings: WorkspaceSettings }).settings;
    },
};
