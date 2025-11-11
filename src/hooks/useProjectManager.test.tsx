import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InvalidateOptions, InvalidateQueryFilters } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { ProjectManagerProvider, useProjectManager } from './useProjectManager';

let queryClient: QueryClient;
let invalidateQueriesSpy: MockInstance<
  [filters?: InvalidateQueryFilters | undefined, options?: InvalidateOptions | undefined],
  Promise<void>
> | null;
let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

const baseWorkspace = vi.hoisted(() => ({
  projects: [
    {
      id: 'project-1',
      config: {
        projectName: 'Projekt Alpha',
        projectStartDate: '2025-01-01',
        projectEndDate: '2025-06-01',
      },
      reports: [],
      projectMembers: [],
      status: 'active' as const,
      permissions: { canEdit: true, canLogTime: true },
    },
  ],
  employees: [
    {
      id: 'employee-1',
      name: 'Alice',
      email: 'alice@example.com',
      location: 'Sano Aarhus',
      maxCapacityHoursWeek: 37.5,
    },
  ],
  settings: {
    pmoBaselineHoursWeek: 150,
  },
}));

const mockApi = vi.hoisted(() => {
  const cloneWorkspace = () => JSON.parse(JSON.stringify(baseWorkspace));
  return {
    checkSetupStatus: vi.fn(async () => ({ needsSetup: false })),
    getAuthenticatedUser: vi.fn(async () => ({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'Administrator',
    })),
    getWorkspace: vi.fn(async () => cloneWorkspace()),
    createEmployee: vi.fn(async (employee) => employee),
    updateEmployee: vi.fn(async ({ employeeId, updates }) => ({ id: employeeId, ...updates })),
    deleteEmployee: vi.fn(async () => undefined),
    createProject: vi.fn(async (project) => ({ project })),
    updateProject: vi.fn(async (project) => ({ project })),
    deleteProject: vi.fn(async () => undefined),
    addProjectMember: vi.fn(async () => ({
      id: 'member-1',
      employeeId: 'employee-1',
      role: 'Ny rolle',
      group: 'unassigned',
      timeEntries: [],
    })),
    updateProjectMember: vi.fn(async () => ({
      id: 'member-1',
      employeeId: 'employee-1',
      role: 'Opdateret rolle',
      group: 'unassigned',
      timeEntries: [],
    })),
    deleteProjectMember: vi.fn(async () => undefined),
    updateWorkspaceSettings: vi.fn(async (settings) => ({ settings })),
    login: vi.fn(async () => ({ success: true })),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => ({ success: true, message: 'ok' })),
    getUsers: vi.fn(async () => []),
    updateUserRole: vi.fn(async () => ({ success: true })),
    logTimeEntry: vi.fn(async () => ({ success: true, member: null })),
  } as const;
});

vi.mock('../api', () => ({
  api: mockApi,
}));

describe('useProjectManager', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ProjectManagerProvider>{children}</ProjectManagerProvider>
      </QueryClientProvider>
    );

    Object.values(mockApi).forEach((fn) => {
      if (typeof fn?.mockClear === 'function') {
        fn.mockClear();
      }
    });

    mockApi.getAuthenticatedUser.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'Administrator',
    });
    mockApi.getWorkspace.mockResolvedValue(JSON.parse(JSON.stringify(baseWorkspace)));
    localStorage.clear();
  });

  afterEach(() => {
    queryClient.clear();
    invalidateQueriesSpy?.mockRestore();
    invalidateQueriesSpy = null;
  });

  it('loads workspace data and marks admin access', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });

    await waitFor(() => expect(mockApi.getWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.projects.length).toBeGreaterThan(0));

    expect(result.current.isAdministrator).toBe(true);
    expect(result.current.projects).toHaveLength(1);
    expect(result.current.workspaceSettings.pmoBaselineHoursWeek).toBe(150);
  });

  it('creates a new project with default configuration', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });
    await waitFor(() => expect(mockApi.getWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.projects.length).toBeGreaterThan(0));

    const name = 'Nyt Projekt';

    act(() => {
      result.current.createNewProject(name);
    });

    const createdProject = result.current.projects.find((p) => p.config.projectName === name);
    expect(createdProject).toBeDefined();
    expect(createdProject?.status).toBe('active');

    await waitFor(() => expect(mockApi.createProject).toHaveBeenCalledTimes(1));
  });

  it('deletes a project and removes it from the workspace', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });
    await waitFor(() => expect(mockApi.getWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.projects.length).toBeGreaterThan(0));

    let createdProjectId: string | undefined;
    act(() => {
      const project = result.current.createNewProject('Projekt Beta');
      createdProjectId = project?.id;
    });

    await waitFor(() => expect(mockApi.createProject).toHaveBeenCalledTimes(1));

    act(() => {
      if (createdProjectId) {
        result.current.deleteProject(createdProjectId);
      }
    });

    expect(result.current.projects.some((p) => p.id === createdProjectId)).toBe(false);
    await waitFor(() => expect(mockApi.deleteProject).toHaveBeenCalledWith(createdProjectId));
  });

  it('updates PMO baseline via mutation', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });
    await waitFor(() => expect(mockApi.getWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.projects.length).toBeGreaterThan(0));

    act(() => {
      result.current.updatePmoBaselineHoursWeek(200);
    });

    expect(result.current.workspaceSettings.pmoBaselineHoursWeek).toBe(200);
    await waitFor(() => expect(mockApi.updateWorkspaceSettings).toHaveBeenCalledWith({ pmoBaselineHoursWeek: 200 }));
  });

  it('mutates employee changes via API and re-fetches workspace', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });

    await waitFor(() => expect(mockApi.getWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.employees.length).toBeGreaterThan(0));

    await act(async () => {
      result.current.updateEmployee('employee-1', { name: 'Alice Updated' });
    });

    await waitFor(() =>
      expect(result.current.employees.find((employee) => employee.id === 'employee-1')?.name).toBe('Alice Updated'),
    );

    await waitFor(() =>
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['workspace'] })),
    );
  });

  it('patches project configuration through updateProject mutation', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });

    await waitFor(() => expect(mockApi.getWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.projects.length).toBeGreaterThan(0));

    const newName = 'Projekt Beta';
    await act(async () => {
      result.current.updateProjectConfig('project-1', { projectName: newName });
    });

    await waitFor(() =>
      expect(result.current.getProjectById('project-1')?.config.projectName).toBe(newName),
    );

    await waitFor(() =>
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['workspace'] })),
    );
  });
});
