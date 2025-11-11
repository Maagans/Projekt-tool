import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../api';
import { useProjectRisks, projectRiskKeys } from './useProjectRisks';
import type { ProjectRisk } from '../types';

vi.mock('../app/constants', () => ({
  PROJECT_RISK_ANALYSIS_ENABLED: true,
}));

const getProjectRisksSpy = vi.spyOn(api, 'getProjectRisks');
const createProjectRiskSpy = vi.spyOn(api, 'createProjectRisk');
const updateProjectRiskSpy = vi.spyOn(api, 'updateProjectRisk');
const archiveProjectRiskSpy = vi.spyOn(api, 'archiveProjectRisk');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

const baseRisk: ProjectRisk = {
  id: 'risk-1',
  projectId: 'proj-1',
  title: 'Vendor delay',
  description: '',
  probability: 3,
  impact: 4,
  score: 12,
  mitigationPlanA: null,
  mitigationPlanB: null,
  owner: null,
  followUpNotes: null,
  followUpFrequency: null,
  category: { key: 'timeline', label: 'Tidsplan', badge: 'emerald' },
  lastFollowUpAt: null,
  dueDate: null,
  status: 'open',
  isArchived: false,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  getProjectRisksSpy.mockReset();
  createProjectRiskSpy.mockReset();
  updateProjectRiskSpy.mockReset();
  archiveProjectRiskSpy.mockReset();
});

describe('useProjectRisks', () => {
  it('fetches project risks with filters', async () => {
    getProjectRisksSpy.mockResolvedValue([baseRisk]);

    const { wrapper, queryClient } = createWrapper();
    const filters = { status: 'open', includeArchived: true };
    const expectedFilters = {
      status: 'open' as const,
      includeArchived: true,
      ownerId: undefined,
      category: undefined,
      overdue: false,
    };
    const { result } = renderHook(() => useProjectRisks('proj-1', filters), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getProjectRisksSpy).toHaveBeenCalledWith('proj-1', expectedFilters);
    expect(result.current.risks).toHaveLength(1);
    expect(projectRiskKeys.list('proj-1', expectedFilters)).toEqual(['project-risks', 'proj-1', expectedFilters]);
    queryClient.clear();
  });

  it('creates, updates and archives risks with cache invalidation', async () => {
    getProjectRisksSpy.mockResolvedValue([]);
    const createdRisk: ProjectRisk = {
      ...baseRisk,
      id: 'risk-2',
      projectId: 'proj-2',
      title: 'Outage',
      probability: 4,
      impact: 5,
      score: 20,
      category: { key: 'technical', label: 'Teknisk', badge: 'slate' },
    };
    createProjectRiskSpy.mockResolvedValue(createdRisk);
    updateProjectRiskSpy.mockResolvedValue({ ...createdRisk, score: 16 });
    archiveProjectRiskSpy.mockResolvedValue();

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useProjectRisks('proj-2'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await result.current.createRisk({ title: 'Outage', probability: 4, impact: 5 });
    expect(createProjectRiskSpy).toHaveBeenCalledWith('proj-2', {
      title: 'Outage',
      probability: 4,
      impact: 5,
    });

    await result.current.updateRisk({ riskId: 'risk-2', updates: { probability: 4 } });
    expect(updateProjectRiskSpy).toHaveBeenCalledWith('risk-2', { probability: 4 });

    await result.current.archiveRisk('risk-2');
    expect(archiveProjectRiskSpy).toHaveBeenCalledWith('risk-2');

    expect(invalidateSpy).toHaveBeenCalled();
    queryClient.clear();
  });

  it('keeps query idle when projectId is missing', () => {
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useProjectRisks(null), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(getProjectRisksSpy).not.toHaveBeenCalled();
    expect(result.current.risks).toEqual([]);
    expect(projectRiskKeys.project(null)).toEqual(['project-risks', null]);
    queryClient.clear();
  });
});
