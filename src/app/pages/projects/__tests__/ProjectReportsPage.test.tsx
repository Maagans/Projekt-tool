import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUseProjectReports = vi.fn();
const mockUseReportDetail = vi.fn();
const mockQueryClient = {
  setQueryData: vi.fn(),
  getQueryData: vi.fn(() => []),
  removeQueries: vi.fn(),
};

const apiMocks = vi.hoisted(() => ({
  planApi: { getSnapshot: vi.fn() },
  reportApi: {
    createReport: vi.fn(),
    updateReport: vi.fn(),
    deleteReport: vi.fn(),
    listReports: vi.fn(),
    getReport: vi.fn(),
  },
  fetchWithAuth: vi.fn(async () => ({})),
}));

vi.mock('../../../hooks/useReports', () => ({
  __esModule: true,
  reportKeys: {
    project: (projectId: string | null) => ['reports', projectId],
    detail: (reportId: string | null) => ['reports', 'detail', reportId],
  },
  useProjectReports: (...args: unknown[]) => mockUseProjectReports(...args),
  useReportDetail: (...args: unknown[]) => mockUseReportDetail(...args),
  useReportStatusCards: () => ({ mutate: vi.fn(), isPending: false }),
  useReportKanban: () => ({ mutate: vi.fn(), isPending: false }),
  useReportRiskMatrix: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../../../hooks/useProjectRisks', () => ({
  __esModule: true,
  useProjectRisks: () => ({ risks: [], isLoading: false }),
}));

vi.mock('@tanstack/react-query', () => ({
  __esModule: true,
  useQueryClient: () => mockQueryClient,
  useQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
    isFetching: false,
    error: null,
  })),
  useMutation: (options: any) => {
    const mutateAsync = async (vars: any) => {
      const result = options?.mutationFn ? await options.mutationFn(vars) : undefined;
      await options?.onSuccess?.(result, vars, undefined);
      return result;
    };
    const mutate = (vars: any) => {
      void mutateAsync(vars);
    };
    return { mutate, mutateAsync, isPending: false };
  },
}));

const mockUseProjectRouteContext = vi.fn();

vi.mock('../ProjectLayout', () => ({
  __esModule: true,
  useProjectRouteContext: (...args: unknown[]) => mockUseProjectRouteContext(...args),
}));

// API mocks
vi.mock('../../../../api/planApi', () => ({ __esModule: true, planApi: apiMocks.planApi }));
vi.mock('../../../../api/reportApi', () => ({ __esModule: true, reportApi: apiMocks.reportApi }));
vi.mock('../../../../api', () => ({ __esModule: true, fetchWithAuth: apiMocks.fetchWithAuth }));

import { ProjectReportsPage } from '../ProjectReportsPage';

const baseProject = {
  id: 'proj-1',
  status: 'active',
  config: {
    projectName: 'Apollo',
    projectStartDate: '2025-01-01',
    projectEndDate: '2025-12-31',
    projectGoal: '',
    businessCase: '',
    totalBudget: null,
  },
  workstreams: [{ id: 'ws-1', name: 'Stream A', order: 0 }],
  reports: [],
  projectMembers: [],
  permissions: {
    canEdit: true,
    canLogTime: true,
  },
};

const baseReport = {
  id: 'rep-1',
  projectId: 'proj-1',
  weekKey: '2025-W01',
  state: {
    statusItems: [],
    challengeItems: [],
    nextStepItems: [],
    mainTableRows: [],
    risks: [],
    phases: [
      { id: 'phase-1', text: 'Analyse', start: 0, end: 25, highlight: '', workstreamId: null, startDate: null, endDate: null, status: null },
    ],
    milestones: [{ id: 'mile-1', text: 'Gate', position: 20, date: '2025-02-01', status: null, workstreamId: null }],
    deliverables: [{ id: 'del-1', text: 'Spec', position: 15, milestoneId: 'mile-1', status: null, owner: null, ownerId: null, description: null, notes: null, startDate: null, endDate: null, progress: null, checklist: [] }],
    kanbanTasks: [],
    workstreams: [{ id: 'ws-1', name: 'Stream A', order: 0 }],
  },
};

const renderPage = () => {
  return render(
    <MemoryRouter>
      <ProjectReportsPage />
    </MemoryRouter>,
  );
};

describe('ProjectReportsPage snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.reportApi.listReports.mockResolvedValue([]);
    apiMocks.reportApi.getReport.mockResolvedValue(baseReport);
    mockUseProjectRouteContext.mockReturnValue({
      project: baseProject,
      projectManager: { canManage: true, employees: [], logout: vi.fn(), currentUser: { id: 'user-1', name: 'Admin', email: 'a@example.com', role: 'Administrator' }, isSaving: false, apiError: null },
    });
  });

  it('creates a new report seeded from plan snapshot when none exist', async () => {
    mockUseProjectReports.mockReturnValue({
      reports: [],
      query: { isLoading: false, isFetching: false, error: null },
      isLoading: false,
      isFetching: false,
    });
    mockUseReportDetail.mockReturnValue({
      report: null,
      query: { isLoading: false, isFetching: false, error: null, refetch: vi.fn() },
      isLoading: false,
      isFetching: false,
    });

    const planSnapshot = {
      projectId: 'proj-1',
      generatedAt: new Date().toISOString(),
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      phases: [{ id: 'phase-plan', label: 'Plan phase', startPercentage: 0, endPercentage: 10, highlight: '', workstreamId: null, startDate: null, endDate: null, status: null }],
      milestones: [{ id: 'mile-plan', label: 'Plan mile', workstreamId: null, position: 5, dueDate: '2025-01-15', status: null }],
      deliverables: [{ id: 'del-plan', label: 'Plan del', milestoneId: 'mile-plan', position: 5, status: null, ownerName: null, ownerEmployeeId: null, description: null, notes: null, startDate: null, endDate: null, progress: null, checklist: [] }],
    };

    apiMocks.planApi.getSnapshot.mockResolvedValue(planSnapshot);
    apiMocks.reportApi.createReport.mockImplementation(async (projectId: string, payload: any) => ({
      id: 'rep-new',
      projectId,
      weekKey: payload.weekKey,
      state: payload.state,
    }));

    renderPage();

    fireEvent.click(screen.getByText(/Opret/i));
    fireEvent.click(screen.getByRole('button', { name: 'Opret' }));

    await waitFor(() => expect(apiMocks.planApi.getSnapshot).toHaveBeenCalledWith('proj-1'));
    expect(apiMocks.reportApi.createReport).toHaveBeenCalled();
    const [, payload] = apiMocks.reportApi.createReport.mock.calls[0];
    expect(payload.state.phases[0].text).toBe('Plan phase');
    expect(payload.state.deliverables[0].text).toBe('Plan del');
  });
});
