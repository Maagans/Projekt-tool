// src/api/adminApi.ts
// User management (admin functions)
import type { User, UserRole } from '../types';
import { fetchWithAuth } from './client';

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
};
