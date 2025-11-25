import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportApi, type ReportDetail, type ReportState, type ReportSummary } from '../api/report';
import type { KanbanTask, ListItem, MainTableRow, Phase, Milestone, Deliverable, Workstream, Risk } from '../types';

export const reportKeys = {
  all: ['reports'] as const,
  project: (projectId: string | null) => [...reportKeys.all, projectId] as const,
  detail: (reportId: string | null) => [...reportKeys.all, 'detail', reportId] as const,
};

const ensureReportLoaded = (reportId: string, detail: ReportDetail | undefined): ReportDetail => {
  if (!detail) {
    throw new Error(`Report ${reportId} is not loaded i cache.`);
  }
  return detail;
};

const mergeState = (current: ReportState, patch: Partial<ReportState>): ReportState => ({
  statusItems: patch.statusItems ?? current.statusItems ?? [],
  challengeItems: patch.challengeItems ?? current.challengeItems ?? [],
  nextStepItems: patch.nextStepItems ?? current.nextStepItems ?? [],
  mainTableRows: patch.mainTableRows ?? current.mainTableRows ?? [],
  risks: patch.risks ?? current.risks ?? [],
  // Planfelter er read-only snapshots fra backend; vi bevarer current
  phases: current.phases ?? [],
  milestones: current.milestones ?? [],
  deliverables: current.deliverables ?? [],
  kanbanTasks: patch.kanbanTasks ?? current.kanbanTasks ?? [],
  workstreams: current.workstreams ?? [],
});

export const useProjectReports = (projectId: string | null) => {
  const query = useQuery<ReportSummary[]>({
    queryKey: reportKeys.project(projectId ?? null),
    queryFn: () => {
      if (!projectId) return Promise.resolve<ReportSummary[]>([]);
      return reportApi.listReports(projectId);
    },
    enabled: Boolean(projectId),
  });

  return {
    reports: query.data ?? [],
    query,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
};

export const useReportDetail = (reportId: string | null) => {
  const query = useQuery<ReportDetail>({
    queryKey: reportKeys.detail(reportId ?? null),
    queryFn: () => {
      if (!reportId) {
        return Promise.reject(new Error('ReportId mangler.'));
      }
      return reportApi.getReport(reportId);
    },
    enabled: Boolean(reportId),
  });

  return {
    report: query.data ?? null,
    query,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
};

const useReportStateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, state }: { reportId: string; state: ReportState }) => {
      const updated = await reportApi.updateReport(reportId, { state });
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(reportKeys.detail(updated.id), updated);
    },
  });
};

// Timeline mutation er fjernet (rapport-tidslinje er read-only snapshots)

export const useReportRiskMatrix = () => {
  const queryClient = useQueryClient();
  const baseMutation = useReportStateMutation();

  return useMutation({
    mutationFn: async ({ reportId, risks }: { reportId: string; risks: Risk[] }) => {
      const current = queryClient.getQueryData<ReportDetail>(reportKeys.detail(reportId));
      const loaded = ensureReportLoaded(reportId, current);
      const nextState = mergeState(loaded.state, { risks });
      return baseMutation.mutateAsync({ reportId, state: nextState });
    },
  });
};

export const useReportKanban = () => {
  const queryClient = useQueryClient();
  const baseMutation = useReportStateMutation();

  return useMutation({
    mutationFn: async ({ reportId, kanbanTasks }: { reportId: string; kanbanTasks: KanbanTask[] }) => {
      const current = queryClient.getQueryData<ReportDetail>(reportKeys.detail(reportId));
      const loaded = ensureReportLoaded(reportId, current);
      const nextState = mergeState(loaded.state, { kanbanTasks });
      return baseMutation.mutateAsync({ reportId, state: nextState });
    },
  });
};

export const useReportStatusCards = () => {
  const queryClient = useQueryClient();
  const baseMutation = useReportStateMutation();

  return useMutation({
    mutationFn: async ({
      reportId,
      statusItems,
      challengeItems,
      nextStepItems,
      mainTableRows,
    }: {
      reportId: string;
      statusItems?: ListItem[];
      challengeItems?: ListItem[];
      nextStepItems?: ListItem[];
      mainTableRows?: MainTableRow[];
    }) => {
      const current = queryClient.getQueryData<ReportDetail>(reportKeys.detail(reportId));
      const loaded = ensureReportLoaded(reportId, current);
      const nextState = mergeState(loaded.state, {
        statusItems: statusItems ?? loaded.state.statusItems,
        challengeItems: challengeItems ?? loaded.state.challengeItems,
        nextStepItems: nextStepItems ?? loaded.state.nextStepItems,
        mainTableRows: mainTableRows ?? loaded.state.mainTableRows,
      });
      return baseMutation.mutateAsync({ reportId, state: nextState });
    },
  });
};
