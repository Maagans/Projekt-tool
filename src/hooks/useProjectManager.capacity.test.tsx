import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectManagerProvider, useProjectManager } from './useProjectManager';
import { DEFAULT_EMPLOYEE_CAPACITY } from '../constants';

let queryClient: QueryClient;
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
    pmoBaselineHoursWeek: 160,
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

describe('useProjectManager capacity handling', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

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
  });

  it('adds employees with provided or default capacity', async () => {
    const { result } = renderHook(() => useProjectManager(), { wrapper });

    await waitFor(() => expect(mockApi.getWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
    await waitFor(() => expect(result.current.projects.length).toBeGreaterThan(0));

    act(() => {
      result.current.addEmployee('Bob', 'Sano Aarhus', 'bob@example.com', 40);
      result.current.addEmployee('Charlie', 'Sano Aarhus', 'charlie@example.com');
    });

    await waitFor(() => expect(result.current.employees.length).toBe(3));

    const bob = result.current.employees.find((employee) => employee.email === 'bob@example.com');
    const charlie = result.current.employees.find((employee) => employee.email === 'charlie@example.com');

    expect(bob?.maxCapacityHoursWeek).toBe(40);
    expect(charlie?.maxCapacityHoursWeek).toBe(DEFAULT_EMPLOYEE_CAPACITY);
  });

  it('imports capacity values from CSV', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const { result } = renderHook(() => useProjectManager(), { wrapper });

    await waitFor(() => expect(mockApi.getWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
    await waitFor(() => expect(result.current.projects.length).toBeGreaterThan(0));

    const csvContent = [
      'Navn,Lokation,Email,Kapacitet (timer/uge)',
      'Alice,Sano Aarhus,alice@example.com,42',
      'Charlie,Sano Middelfart,charlie@example.com,35.5',
    ].join('\n');

    act(() => {
      result.current.importEmployeesFromCsv(csvContent);
    });

    await waitFor(() => expect(result.current.employees.some((employee) => employee.email === 'charlie@example.com')).toBe(true));

    const updatedAlice = result.current.employees.find((employee) => employee.email === 'alice@example.com');
    const newEmployee = result.current.employees.find((employee) => employee.email === 'charlie@example.com');

    expect(updatedAlice?.maxCapacityHoursWeek).toBe(42);
    expect(updatedAlice?.location).toBe('Sano Aarhus');
    expect(newEmployee?.maxCapacityHoursWeek).toBe(35.5);

    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

