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

export interface AuditLogEntry {
    id: string;
    created_at: string;
    user_id: string | null;
    user_name: string;
    user_role: string;
    workspace_id: string | null;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED';
    entity_type: string;
    entity_id: string | null;
    entity_name: string | null;
    description: string;
    ip_address: string | null;
}

export interface AuditLogFilters {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface AuditLogResponse {
    logs: AuditLogEntry[];
    total: number;
    limit: number;
    offset: number;
}

export interface AuditLogUser {
    user_id: string;
    user_name: string;
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

    async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
        const params = new URLSearchParams();
        if (filters.userId) params.append('userId', filters.userId);
        if (filters.action) params.append('action', filters.action);
        if (filters.entityType) params.append('entityType', filters.entityType);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.limit) params.append('limit', String(filters.limit));
        if (filters.offset) params.append('offset', String(filters.offset));

        const query = params.toString();
        return fetchWithAuth(`/api/admin/audit-logs${query ? `?${query}` : ''}`);
    },

    async getAuditLogUsers(): Promise<AuditLogUser[]> {
        return fetchWithAuth('/api/admin/audit-logs/users');
    },

    exportAuditLogsCsvUrl(filters: AuditLogFilters = {}): string {
        const params = new URLSearchParams();
        if (filters.userId) params.append('userId', filters.userId);
        if (filters.action) params.append('action', filters.action);
        if (filters.entityType) params.append('entityType', filters.entityType);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const query = params.toString();
        return `/api/admin/audit-logs/export${query ? `?${query}` : ''}`;
    },
};
