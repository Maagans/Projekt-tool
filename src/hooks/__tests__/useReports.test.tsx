import { describe, expect, it, vi, beforeEach, type MockedFunction } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjectReports, useReportKanban, reportKeys } from '../useReports';
import type { ReportDetail } from '../../api/report';

vi.mock('../../api/report', () => {
  return {
    reportApi: {
      listReports: vi.fn(),
      getReport: vi.fn(),
      createReport: vi.fn(),
      updateReport: vi.fn(),
      deleteReport: vi.fn(),
    },
  };
});

const { reportApi } = await import('../../api/report');
const mockedList = reportApi.listReports as MockedFunction<typeof reportApi.listReports>;
const mockedUpdate = reportApi.updateReport as MockedFunction<typeof reportApi.updateReport>;

const createWrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useReports hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('fetches project reports', async () => {
    mockedList.mockResolvedValue([{ id: 'rep-1', weekKey: '2024-W01' }]);
    const { result } = renderHook(() => useProjectReports('project-1'), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.query.refetch();
    await waitFor(() => {
      expect(reportApi.listReports).toHaveBeenCalledWith('project-1');
      expect(result.current.reports[0]?.id).toBe('rep-1');
    });
  });

  it('updates kanban state and caches report detail', async () => {
    const initial: ReportDetail = {
      id: 'rep-1',
      projectId: 'project-1',
      weekKey: '2024-W01',
      state: {
        statusItems: [],
        challengeItems: [],
        nextStepItems: [],
        mainTableRows: [],
        risks: [],
        kanbanTasks: [],
        phases: [],
        milestones: [],
        deliverables: [],
        workstreams: [],
      },
    };
    queryClient.setQueryData(reportKeys.detail('rep-1'), initial);

    const updated: ReportDetail = {
      ...initial,
      state: {
        ...initial.state,
        kanbanTasks: [
          {
            id: 'k1',
            content: 'Test task',
            status: 'todo',
            assignee: null,
            dueDate: null,
            notes: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      },
    };

    mockedUpdate.mockResolvedValue(updated);

    const { result } = renderHook(() => useReportKanban(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      reportId: 'rep-1',
      kanbanTasks: updated.state.kanbanTasks,
    });

    expect(reportApi.updateReport).toHaveBeenCalledWith(
      'rep-1',
      expect.objectContaining({
        state: expect.objectContaining({
          kanbanTasks: updated.state.kanbanTasks,
        }),
      }),
    );
    const cached = queryClient.getQueryData<ReportDetail>(reportKeys.detail('rep-1'));
    expect(cached?.state.kanbanTasks).toHaveLength(1);
  });
});
