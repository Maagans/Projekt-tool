import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type {
  ProjectRisk,
  ProjectRiskFilters,
  ProjectRiskInput,
  ProjectRiskUpdateInput,
} from '../types';
import { PROJECT_RISK_ANALYSIS_ENABLED } from '../app/constants';

export const projectRiskKeys = {
  all: ['project-risks'] as const,
  project: (projectId: string | null) => [...projectRiskKeys.all, projectId] as const,
  list: (projectId: string | null, filters: ProjectRiskFilters) => [
    ...projectRiskKeys.project(projectId),
    filters,
  ] as const,
};

const normalizeFilters = (filters: ProjectRiskFilters = {}): ProjectRiskFilters => ({
  status: filters.status ?? undefined,
  ownerId: filters.ownerId ?? undefined,
  category: filters.category ?? undefined,
  includeArchived: Boolean(filters.includeArchived),
  overdue: Boolean(filters.overdue),
});

export const useProjectRisks = (projectId: string | null, filters: ProjectRiskFilters = {}) => {
  const queryClient = useQueryClient();
  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);

  const queryKey = useMemo(
    () => projectRiskKeys.list(projectId ?? null, normalizedFilters),
    [projectId, normalizedFilters],
  );

  const listQuery = useQuery<ProjectRisk[]>({
    queryKey,
    queryFn: () => {
      if (!projectId) {
        return Promise.resolve([]);
      }
      return api.getProjectRisks(projectId, normalizedFilters);
    },
    enabled: Boolean(projectId) && PROJECT_RISK_ANALYSIS_ENABLED,
  });

  const invalidate = useCallback(() => {
    if (!projectId) return;
    queryClient.invalidateQueries({ queryKey: projectRiskKeys.project(projectId) });
  }, [projectId, queryClient]);

  const createMutation = useMutation({
    mutationFn: (payload: ProjectRiskInput) => {
      if (!projectId) {
        throw new Error('projectId is required to create a risk.');
      }
      return api.createProjectRisk(projectId, payload);
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ riskId, updates }: { riskId: string; updates: ProjectRiskUpdateInput }) =>
      api.updateProjectRisk(riskId, updates),
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: (riskId: string) => api.archiveProjectRisk(riskId),
    onSuccess: invalidate,
  });

  return {
    risks: listQuery.data ?? [],
    query: listQuery,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
    refetch: listQuery.refetch,
    createRisk: createMutation.mutateAsync,
    updateRisk: updateMutation.mutateAsync,
    archiveRisk: archiveMutation.mutateAsync,
    createStatus: createMutation.status,
    updateStatus: updateMutation.status,
    archiveStatus: archiveMutation.status,
    isMutating:
      createMutation.isPending || updateMutation.isPending || archiveMutation.isPending,
  };
};
