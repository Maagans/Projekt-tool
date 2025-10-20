import type { ProjectMember, User, UserRole, WorkspaceData } from './types';

const AUTH_USER_KEY = 'authUser';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const resolveUrl = (path: string) => {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with "/": ${path}`);
  }
  return `${API_BASE_URL}${path}`;
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

// --- REAL BACKEND API CONNECTOR ---
// This module now handles real communication with the backend.
// It uses `fetch` to send and receive data from the server.
// Error handling and authentication headers are managed centrally here.

/**
 * A helper function to manage authenticated fetch requests.
 * It automatically adds the JWT token to the headers and handles standard response validation.
 * @param url The API endpoint URL.
 * @param options The standard fetch options object.
 * @returns The JSON response from the server.
 */
let hasHandledUnauthorized = false;

const fetchWithAuth = async (path: string, options: RequestInit = {}) => {
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

  if (response.status === 401 && !path.includes('/api/logout')) {
    localStorage.removeItem(AUTH_USER_KEY);
    if (!hasHandledUnauthorized) {
      hasHandledUnauthorized = true;
      window.location.href = '/login';
    }
    throw new Error('Session was invalid. Redirecting to login.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown server error occurred.' }));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {};
};


export const api = {
  // NEW: Check if the application needs initial setup
  async checkSetupStatus(): Promise<{ needsSetup: boolean }> {
      // This is an unauthenticated endpoint.
      const response = await fetch(resolveUrl('/api/setup/status'), { credentials: 'include' });
      if (!response.ok) {
          throw new Error('Could not check setup status.');
      }
      return response.json();
  },

  // NEW: Create the first administrator user
  async createFirstUser(name: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
     try {
      // This is an unauthenticated endpoint.
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
    } catch (error: any) {
      return { success: false, message: error.message };
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
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user as User };
      }
      return { success: false, message: 'Login failed: Invalid response from server.' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async register(email: string, name: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // This is an unauthenticated endpoint.
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
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async logout(): Promise<void> {
    // It's good practice to inform the backend about logout to invalidate the session/token.
    try {
        await fetchWithAuth('/api/logout', { method: 'POST' });
    } catch (error) {
        console.warn("Logout API call failed, but logging out on client-side anyway.", error);
    } finally {
        // Always clear local storage regardless of API call success.
        localStorage.removeItem(AUTH_USER_KEY);
    }
  },

  async getAuthenticatedUser(): Promise<User | null> {
    // This remains a client-side check for an existing session.
    // The token's validity is verified by each subsequent API call.
    const userJson = localStorage.getItem(AUTH_USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        // If parsing fails, clear corrupted data.
        localStorage.removeItem(AUTH_USER_KEY);
        return null;
      }
    }
    return null;
  },

  async getWorkspace(): Promise<WorkspaceData> {
    // Fetch the entire user workspace (projects, employees) from the backend.
    return fetchWithAuth('/api/workspace');
  },

  async saveWorkspace(workspaceData: WorkspaceData): Promise<{ success: boolean }> {
    // Send the entire workspace state to the backend to be saved.
    await fetchWithAuth('/api/workspace', {
        method: 'POST', // Or PUT, depending on backend API design (POST for create/update)
        body: JSON.stringify(workspaceData),
    });
    return { success: true };
  },

  async logTimeEntry(projectId: string, memberId: string, weekKey: string, hours: { plannedHours?: number; actualHours?: number }): Promise<{ success: boolean; member?: ProjectMember }> {
    const payload: Record<string, unknown> = { memberId, weekKey };
    if (typeof hours.plannedHours === 'number') {
      payload.plannedHours = hours.plannedHours;
    }
    if (typeof hours.actualHours === 'number') {
      payload.actualHours = hours.actualHours;
    }
    return fetchWithAuth(`/api/projects/${projectId}/time-entries`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getUsers(): Promise<User[]> {
    return fetchWithAuth('/api/users');
  },

  async updateUserRole(userId: string, role: UserRole): Promise<{ success: boolean }> {
    await fetchWithAuth(`/api/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
    });
    return { success: true };
  }
};



