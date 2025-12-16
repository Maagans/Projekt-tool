// src/api/authApi.ts
// Authentication and user session management
import type { User } from '../types';
import { fetchWithAuth, resolveUrl, toErrorMessage, AUTH_USER_STORAGE_KEY } from './client';

export const authApi = {
    async checkSetupStatus(): Promise<{ needsSetup: boolean }> {
        const response = await fetch(resolveUrl('/api/setup/status'), { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Could not check setup status.');
        }
        return response.json();
    },

    async createFirstUser(name: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(resolveUrl('/api/setup/create-first-user'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }
            return { success: true, message: data.message };
        } catch (error: unknown) {
            return { success: false, message: toErrorMessage(error) };
        }
    },

    async login(email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
        try {
            const response = await fetch(resolveUrl('/api/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }

            if (data.user) {
                localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user));
                return { success: true, user: data.user as User };
            }
            return { success: false, message: 'Login failed: Invalid response from server.' };
        } catch (error: unknown) {
            return { success: false, message: toErrorMessage(error) };
        }
    },

    async register(email: string, name: string, password: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(resolveUrl('/api/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, password }),
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }
            return { success: true, message: data.message };
        } catch (error: unknown) {
            return { success: false, message: toErrorMessage(error) };
        }
    },

    async logout(): Promise<void> {
        try {
            await fetchWithAuth('/api/logout', { method: 'POST' });
        } catch (error: unknown) {
            console.warn('Logout API call failed, but logging out on client-side anyway.', error);
        } finally {
            localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        }
    },

    async getAuthenticatedUser(): Promise<User | null> {
        const userJson = localStorage.getItem(AUTH_USER_STORAGE_KEY);
        if (userJson) {
            try {
                return JSON.parse(userJson);
            } catch {
                localStorage.removeItem(AUTH_USER_STORAGE_KEY);
                return null;
            }
        }
        return null;
    },

    async forgotPassword(email: string): Promise<{ success: boolean; isAzureAdUser?: boolean; message?: string }> {
        try {
            const response = await fetch(resolveUrl('/api/forgot-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }
            return data;
        } catch (error: unknown) {
            return { success: false, message: toErrorMessage(error) };
        }
    },

    async resetPassword(token: string, password: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await fetch(resolveUrl('/api/reset-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }
            return data;
        } catch (error: unknown) {
            return { success: false, message: toErrorMessage(error) };
        }
    },

    async refreshSession(): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await fetchWithAuth('/api/refresh', {
                method: 'POST',
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }
            return { success: true, message: data.message };
        } catch (error: unknown) {
            return { success: false, message: toErrorMessage(error) };
        }
    },
};
