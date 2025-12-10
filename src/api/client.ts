// src/api/client.ts
// Core utilities for API communication - all domain modules depend on this file
import { notifyUnauthorizedLogout } from '../hooks/projectManager/authEvents';

export const AUTH_USER_STORAGE_KEY = 'authUser';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export const resolveUrl = (path: string) => {
    if (!path.startsWith('/')) {
        throw new Error(`API path must start with "/": ${path}`);
    }
    return `${API_BASE_URL}${path}`;
};

export const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Der opstod en ukendt fejl.';
};

const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()!.split(';').shift() ?? null;
    }
    return null;
};

const shouldIncludeCsrf = (method?: string) => {
    const upper = (method ?? 'GET').toUpperCase();
    return upper !== 'GET' && upper !== 'HEAD' && upper !== 'OPTIONS';
};

export type HttpError = Error & {
    status?: number;
    data?: unknown;
};

const buildHttpError = (response: Response, body: unknown): HttpError => {
    const message =
        body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `Request failed with status ${response.status}`;

    const error = new Error(message) as HttpError;
    error.status = response.status;
    if (body !== undefined) {
        error.data = body;
    }
    return error;
};

export const fetchWithAuth = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    const method = options.method ?? 'GET';

    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    if (shouldIncludeCsrf(method)) {
        const csrfToken = getCookie('csrfToken');
        if (csrfToken) {
            headers.set('X-CSRF-Token', csrfToken);
        }
    }

    const fullUrl = resolveUrl(path);

    const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (!response.ok) {
        let errorBody: unknown;
        try {
            errorBody = await response.json();
        } catch {
            errorBody = undefined;
        }

        if (response.status === 401 && !path.includes('/api/logout')) {
            localStorage.removeItem(AUTH_USER_STORAGE_KEY);
            notifyUnauthorizedLogout();
        }

        throw buildHttpError(response, errorBody);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return {};
};
