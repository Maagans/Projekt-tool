import type {
  ProjectMember,
  ResourceAnalyticsPayload,
  ResourceAnalyticsQuery,
  ResourceAnalyticsStackEntry,
  ResourceAnalyticsStackProject,
  ResourceAnalyticsTotals,
  Employee,
  Project,
  ProjectRisk,
  ProjectRiskFilters,
  ProjectRiskInput,
  ProjectRiskUpdateInput,
  User,
  UserRole,
  WorkspaceData,
  WorkspaceSettings,
} from './types';
import { notifyUnauthorizedLogout } from './hooks/projectManager/authEvents';

export const AUTH_USER_STORAGE_KEY = 'authUser';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const resolveUrl = (path: string) => {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with "/": ${path}`);
  }
  return `${API_BASE_URL}${path}`;
};

const toErrorMessage = (error: unknown): string => {
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

// --- REAL BACKEND API CONNECTOR ---
// This module now handles real communication with the backend.
// It uses `fetch` to send and receive data from the server.
// Error handling and authentication headers are managed centrally here.

type HttpError = Error & {
  status?: number;
  data?: unknown;
};

const buildHttpError = (response: Response, body: unknown): HttpError => {
  const message =
    body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string'
      ? ((body as { message: string }).message)
      : `Request failed with status ${response.status}`;

  const error = new Error(message) as HttpError;
  error.status = response.status;
  if (body !== undefined) {
    error.data = body;
  }
  return error;
};

const sanitizeProjectPayload = (project: Partial<Project>): Partial<Project> => {
  const clone = JSON.parse(JSON.stringify(project ?? {})) as Partial<Project>;
  const mutableClone = clone as Record<string, unknown>;
  if (mutableClone && typeof mutableClone === 'object' && 'permissions' in mutableClone) {
    delete mutableClone.permissions;
  }
  return clone;
};

const sanitizeRiskPayload = (risk: ProjectRiskInput | ProjectRiskUpdateInput) => {
  const payload: Record<string, unknown> = { ...risk };
  if ('probability' in payload && payload.probability !== undefined) {
    payload.probability = Number(payload.probability);
  }
  if ('impact' in payload && payload.impact !== undefined) {
    payload.impact = Number(payload.impact);
  }
  if ('ownerId' in payload && payload.ownerId === '') {
    payload.ownerId = null;
  }
  if ('lastFollowUpAt' in payload && payload.lastFollowUpAt === '') {
    payload.lastFollowUpAt = null;
  }
  if ('dueDate' in payload && payload.dueDate === '') {
    payload.dueDate = null;
  }
  if ('title' in payload && typeof payload.title === 'string') {
    payload.title = payload.title.trim();
  }
  return payload;
};

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

type ResourceAnalyticsQueryParams = ResourceAnalyticsQuery;

type ResourceAnalyticsApiResponse =
  | {
      success: true;
      data: ResourceAnalyticsPayload;
    }
  | {
      success: false;
      message?: string;
    }
  | ResourceAnalyticsPayload;

const normalizeStackEntries = (stack: unknown[]): ResourceAnalyticsStackEntry[] => {
  if (!Array.isArray(stack)) {
    return [];
  }

  return stack
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const week = typeof (entry as { week?: unknown }).week === 'string' ? (entry as { week: string }).week : '';
      if (!week) {
        return null;
      }

      const projectsRaw = Array.isArray((entry as { projects?: unknown }).projects)
        ? ((entry as { projects: unknown[] }).projects)
        : [];

      const projects = projectsRaw
        .map((project) => {
          if (!project || typeof project !== 'object') {
            return null;
          }
          const projectId =
            typeof (project as { projectId?: unknown }).projectId === 'string'
              ? (project as { projectId: string }).projectId
              : '';
          if (!projectId) {
            return null;
          }
          const projectName =
            typeof (project as { projectName?: unknown }).projectName === 'string'
              ? ((project as { projectName: string }).projectName.trim() || 'Ukendt projekt')
              : 'Ukendt projekt';
          const hoursValue = (project as { hours?: unknown }).hours;
          const hours = Number.isFinite(hoursValue) ? Number(hoursValue) : 0;
          return { projectId, projectName, hours };
        })
        .filter((project): project is ResourceAnalyticsStackProject => project !== null)
        .sort((a, b) => a.projectName.localeCompare(b.projectName, 'da', { sensitivity: 'base' }));

      return { week, projects };
    })
    .filter((entry): entry is ResourceAnalyticsStackEntry => entry !== null)
    .sort((a, b) => a.week.localeCompare(b.week));
};

const normalizeResourceAnalyticsPayload = (payload: ResourceAnalyticsPayload): ResourceAnalyticsPayload => {
  const series = Array.isArray(payload.series) ? payload.series : [];
  const normalizedSeries = series.map((point) => ({
    week: point.week ?? '',
    capacity: Number(point.capacity ?? 0),
    planned: Number(point.planned ?? 0),
    actual: Number(point.actual ?? 0),
  }));

  const totalsFromSeries = normalizedSeries.reduce(
    (acc, point) => ({
      capacity: acc.capacity + point.capacity,
      planned: acc.planned + point.planned,
      actual: acc.actual + point.actual,
    }),
    { capacity: 0, planned: 0, actual: 0 },
  );

  const overAllocatedWeeks = Array.isArray(payload.overAllocatedWeeks)
    ? payload.overAllocatedWeeks.filter((week): week is string => typeof week === 'string')
    : [];

  const projectBreakdown = Array.isArray(payload.projectBreakdown)
    ? payload.projectBreakdown
        .map((item) => ({
          projectId: typeof item.projectId === 'string' ? item.projectId : '',
          projectName:
            typeof item.projectName === 'string' && item.projectName.trim().length > 0 ? item.projectName : 'Ukendt projekt',
          planned: Number(item.planned ?? 0),
          actual: Number(item.actual ?? 0),
        }))
        .filter((item) => item.projectId)
    : [];

  const projectStackPlan = normalizeStackEntries((payload as { projectStackPlan?: unknown[] }).projectStackPlan ?? []);
  const projectStackActual = normalizeStackEntries(
    (payload as { projectStackActual?: unknown[] }).projectStackActual ?? [],
  );

  const totalsRaw = (payload as { totals?: Partial<ResourceAnalyticsTotals> }).totals ?? {};
  const totals: ResourceAnalyticsTotals = {
    capacity: Number.isFinite(totalsRaw.capacity) ? Number(totalsRaw.capacity) : totalsFromSeries.capacity,
    planned: Number.isFinite(totalsRaw.planned) ? Number(totalsRaw.planned) : totalsFromSeries.planned,
    actual: Number.isFinite(totalsRaw.actual) ? Number(totalsRaw.actual) : totalsFromSeries.actual,
    baseline: Number.isFinite(totalsRaw.baseline) ? Number(totalsRaw.baseline) : 0,
  };

  const baselineHoursWeek = Number.isFinite((payload as { baselineHoursWeek?: unknown }).baselineHoursWeek)
    ? Number((payload as { baselineHoursWeek: number }).baselineHoursWeek)
    : 0;
  const baselineTotalHours = Number.isFinite((payload as { baselineTotalHours?: unknown }).baselineTotalHours)
    ? Number((payload as { baselineTotalHours: number }).baselineTotalHours)
    : totals.baseline;

  return {
    scope: {
      type: payload.scope?.type ?? 'department',
      id: payload.scope?.id ?? '',
    },
    series: normalizedSeries,
    overAllocatedWeeks,
    projectBreakdown,
    projectStackPlan,
    projectStackActual,
    totals,
    baselineHoursWeek,
    baselineTotalHours,
  };
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
    } catch (error: unknown) {
      return { success: false, message: toErrorMessage(error) };
    }
  },

  async logout(): Promise<void> {
    // It's good practice to inform the backend about logout to invalidate the session/token.
    try {
        await fetchWithAuth('/api/logout', { method: 'POST' });
    } catch (error: unknown) {
        console.warn("Logout API call failed, but logging out on client-side anyway.", error);
    } finally {
        // Always clear local storage regardless of API call success.
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  },

  async getAuthenticatedUser(): Promise<User | null> {
    // This remains a client-side check for an existing session.
    // The token's validity is verified by each subsequent API call.
    const userJson = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        // If parsing fails, clear corrupted data.
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        return null;
      }
    }
    return null;
  },

  async getWorkspace(): Promise<WorkspaceData> {
    // Fetch the entire user workspace (projects, employees) from the backend.
    return fetchWithAuth('/api/workspace');
  },

  async createEmployee(employee: Partial<Employee> & { name: string; email: string; id?: string }): Promise<Employee> {
    const response = await fetchWithAuth('/api/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
    return (response as { employee: Employee }).employee;
  },

  async updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<Employee> {
    const response = await fetchWithAuth(`/api/employees/${employeeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return (response as { employee: Employee }).employee;
  },

  async deleteEmployee(employeeId: string): Promise<void> {
    await fetchWithAuth(`/api/employees/${employeeId}`, {
      method: 'DELETE',
    });
  },

  async createProject(project: Project): Promise<Project> {
    const response = await fetchWithAuth('/api/projects', {
      method: 'POST',
      body: JSON.stringify(sanitizeProjectPayload(project)),
    });
    return (response as { project: Project }).project;
  },

  async updateProject(project: Partial<Project> & { id: string }): Promise<Project> {
    const response = await fetchWithAuth(`/api/projects/${project.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ project: sanitizeProjectPayload(project) }),
    });
    return (response as { project: Project }).project;
  },

  async deleteProject(projectId: string): Promise<void> {
    await fetchWithAuth(`/api/projects/${projectId}`, { method: 'DELETE' });
  },

  async addProjectMember(
    projectId: string,
    payload: { employeeId: string; role?: string; group?: ProjectMember['group']; id?: string },
  ): Promise<ProjectMember> {
    const response = await fetchWithAuth(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return (response as { member: ProjectMember }).member;
  },

  async updateProjectMember(
    projectId: string,
    memberId: string,
    updates: { role?: string; group?: ProjectMember['group']; isProjectLead?: boolean },
  ): Promise<ProjectMember> {
    const response = await fetchWithAuth(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return (response as { member: ProjectMember }).member;
  },

  async deleteProjectMember(projectId: string, memberId: string): Promise<void> {
    await fetchWithAuth(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  async updateWorkspaceSettings(settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    const response = await fetchWithAuth('/api/workspace/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    return (response as { settings: WorkspaceSettings }).settings;
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
  },

  async getProjectRisks(projectId: string, filters: ProjectRiskFilters = {}): Promise<ProjectRisk[]> {
    if (!projectId) {
      throw new Error('projectId is required to load risks.');
    }
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.ownerId) params.set('ownerId', filters.ownerId);
    if (filters.category) params.set('category', filters.category);
    if (filters.includeArchived) params.set('includeArchived', 'true');
    if (filters.overdue) params.set('overdue', 'true');

    const query = params.toString();
    const response = await fetchWithAuth(
      `/api/projects/${projectId}/risks${query ? `?${query}` : ''}`,
    );
    return (response as { risks: ProjectRisk[] }).risks;
  },

  async createProjectRisk(projectId: string, payload: ProjectRiskInput): Promise<ProjectRisk> {
    const response = await fetchWithAuth(`/api/projects/${projectId}/risks`, {
      method: 'POST',
      body: JSON.stringify(sanitizeRiskPayload(payload)),
    });
    return (response as { risk: ProjectRisk }).risk;
  },

  async updateProjectRisk(riskId: string, payload: ProjectRiskUpdateInput): Promise<ProjectRisk> {
    const response = await fetchWithAuth(`/api/risks/${riskId}`, {
      method: 'PATCH',
      body: JSON.stringify(sanitizeRiskPayload(payload)),
    });
    return (response as { risk: ProjectRisk }).risk;
  },

  async archiveProjectRisk(riskId: string): Promise<void> {
    await fetchWithAuth(`/api/risks/${riskId}`, { method: 'DELETE' });
  },

  async fetchResourceAnalytics(params: ResourceAnalyticsQueryParams): Promise<ResourceAnalyticsPayload> {
    const { scope, scopeId, fromWeek, toWeek } = params;

    if (!scope || !scopeId || !fromWeek || !toWeek) {
      throw new Error('Alle parametre (scope, scopeId, fromWeek, toWeek) er påkrævet.');
    }

    const query = new URLSearchParams({
      scope,
      scopeId,
      fromWeek,
      toWeek,
    });

    const response = (await fetchWithAuth(`/api/analytics/resources?${query.toString()}`)) as ResourceAnalyticsApiResponse;

    if ('success' in response) {
      if (!response.success) {
        throw new Error(response.message ?? 'Kunne ikke hente resource analytics.');
      }
      return normalizeResourceAnalyticsPayload(response.data);
    }

    return normalizeResourceAnalyticsPayload(response);
  },

  async attachReportRisks(reportId: string, riskIds: string[]): Promise<ProjectRisk[]> {
    if (!reportId) {
      throw new Error('reportId is required to synkronisere risici.');
    }
    const response = await fetchWithAuth(`/api/reports/${reportId}/risks`, {
      method: 'POST',
      body: JSON.stringify({ riskIds }),
    });
    return (response as { snapshots: ProjectRisk[] }).snapshots;
  },

  async updateReportRiskSnapshot(
    reportId: string,
    snapshotId: string,
    payload: { probability: number; impact: number },
  ): Promise<ProjectRisk> {
    if (!reportId || !snapshotId) {
      throw new Error('reportId og snapshotId er påkrævet for at opdatere risici.');
    }
    const response = await fetchWithAuth(`/api/reports/${reportId}/risks/${snapshotId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return (response as { snapshot: ProjectRisk }).snapshot;
  },
};












