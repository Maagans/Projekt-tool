import { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectManagerProvider, useProjectManager } from './useProjectManager';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ProjectManagerProvider>{children}</ProjectManagerProvider>
);


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
      location: 'K�benhavn',
      maxCapacityHoursWeek: 37.5,
    },
  ],
}));

const mockApi = vi.hoisted(() => {
  const cloneWorkspace = () => structuredClone(baseWorkspace);
  return {
    checkSetupStatus: vi.fn(async () => ({ needsSetup: false })),
    getAuthenticatedUser: vi.fn(async () => ({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'Administrator',
    })),
    getWorkspace: vi.fn(async () => cloneWorkspace()),
    saveWorkspace: vi.fn(async () => ({ success: true })),
    login: vi.fn(async () => ({ success: true })),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => ({ success: true, message: 'ok' })),
    getUsers: vi.fn(async () => []),
    updateUserRole: vi.fn(async () => ({ success: true })),
    logTimeEntry: vi.fn(async () => ({ success: true, member: null })),
  };
});

vi.mock('../api', () => ({
  api: mockApi,
}));

const waitForAutosave = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1100));
  });

describe('useProjectManager', () => {
  beforeEach(() => {
    Object.values(mockApi).forEach((fn) => fn.mockClear());
    mockApi.getAuthenticatedUser.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'Administrator',
    });
    mockApi.getWorkspace.mockResolvedValue(structuredClone(baseWorkspace));
    localStorage.clear();
  });

  it('loads workspace data and marks admin access', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApi.checkSetupStatus).toHaveBeenCalledTimes(1);
    expect(mockApi.getWorkspace).toHaveBeenCalledTimes(1);
    expect(result.current.isAdministrator).toBe(true);
    expect(result.current.projects).toHaveLength(1);
    expect(result.current.projects[0].config.projectName).toBe('Projekt Alpha');

    await waitForAutosave();
    await waitFor(() => expect(mockApi.saveWorkspace).toHaveBeenCalledTimes(1));
  });

  it('creates a new project with default configuration', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const name = 'Nyt Projekt';

    act(() => {
      result.current.createNewProject(name);
    });

    const createdProject = result.current.projects.find((p) => p.config.projectName === name);
    expect(createdProject).toBeDefined();
    expect(createdProject?.status).toBe('active');

    await waitForAutosave();
    await waitFor(() => expect(mockApi.saveWorkspace).toHaveBeenCalledTimes(1));
  });

  it('deletes a project and removes it from the workspace', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let createdProjectId: string | undefined;
    act(() => {
      const project = result.current.createNewProject('Projekt Beta');
      createdProjectId = project?.id;
    });

    expect(createdProjectId).toBeDefined();

    await waitForAutosave();
    await waitFor(() => expect(mockApi.saveWorkspace).toHaveBeenCalledTimes(1));

    act(() => {
      if (createdProjectId) {
        result.current.deleteProject(createdProjectId);
      }
    });

    expect(result.current.projects.some((p) => p.id === createdProjectId)).toBe(false);

    await waitForAutosave();
    await waitFor(() => expect(mockApi.saveWorkspace).toHaveBeenCalledTimes(2));
  });
});









