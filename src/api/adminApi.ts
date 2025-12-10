// src/api/adminApi.ts
// User management (admin functions)
import type { User, UserRole } from '../types';
import { fetchWithAuth } from './client';

export interface Workspace {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
}

export const adminApi = {
    async getUsers(): Promise<User[]> {
        return fetchWithAuth('/api/users');
    },

    async updateUserRole(userId: string, role: UserRole): Promise<{ success: boolean }> {
        await fetchWithAuth(`/api/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
        });
        return { success: true };
    },

    async updateUserWorkspace(userId: string, workspaceId: string): Promise<{ success: boolean }> {
        await fetchWithAuth(`/api/users/${userId}/workspace`, {
            method: 'PUT',
            body: JSON.stringify({ workspaceId }),
        });
        return { success: true };
    },

    async getWorkspaces(): Promise<Workspace[]> {
        return fetchWithAuth('/api/workspaces');
    },
};
