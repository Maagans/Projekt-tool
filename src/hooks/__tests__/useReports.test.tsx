import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjectReports, useReportTimelineMutation, reportKeys } from '../useReports';
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
    (reportApi.listReports as unknown as vi.Mock).mockResolvedValue([{ id: 'rep-1', weekKey: '2024-W01' }]);
    const { result } = renderHook(() => useProjectReports('project-1'), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.query.refetch();
    await waitFor(() => {
      expect(reportApi.listReports).toHaveBeenCalledWith('project-1');
      expect(result.current.reports[0]?.id).toBe('rep-1');
    });
  });

  it('updates timeline state and caches report detail', async () => {
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
        phases: [],
        milestones: [],
        deliverables: [],
        kanbanTasks: [],
        workstreams: [],
      },
    };
    queryClient.setQueryData(reportKeys.detail('rep-1'), initial);

    const updated: ReportDetail = {
      ...initial,
      state: {
        ...initial.state,
        phases: [
          {
            id: 'p1',
            text: 'Plan',
            start: 0,
            end: 10,
            highlight: '',
            workstreamId: null,
            startDate: null,
            endDate: null,
            status: null,
          },
        ],
      },
    };

    (reportApi.updateReport as unknown as vi.Mock).mockResolvedValue(updated);

    const { result } = renderHook(() => useReportTimelineMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      reportId: 'rep-1',
      phases: updated.state.phases,
      milestones: [],
      deliverables: [],
      workstreams: [],
    });

    expect(reportApi.updateReport).toHaveBeenCalledWith(
      'rep-1',
      expect.objectContaining({
        state: expect.objectContaining({
          phases: updated.state.phases,
        }),
      }),
    );
    const cached = queryClient.getQueryData<ReportDetail>(reportKeys.detail('rep-1'));
    expect(cached?.state.phases).toHaveLength(1);
  });
});
