import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../api';
import { useResourceAnalytics, resourceAnalyticsKeys } from './useResourceAnalytics';
import type { ResourceAnalyticsPayload, ResourceAnalyticsQuery } from '../types';

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

const fetchResourceAnalyticsSpy = vi.spyOn(api, 'fetchResourceAnalytics');

beforeEach(() => {
  fetchResourceAnalyticsSpy.mockReset();
});

afterAll(() => {
  fetchResourceAnalyticsSpy.mockRestore();
});

const baseParams: ResourceAnalyticsQuery = {
  scope: 'department',
  scopeId: 'IT',
  fromWeek: '2025-W01',
  toWeek: '2025-W04',
};

describe('useResourceAnalytics', () => {
  it('normalises series and over-allocation data', async () => {
    const payload: ResourceAnalyticsPayload = {
      scope: { type: 'department', id: 'IT' },
      series: [
        { week: '2025-W03', capacity: 300, planned: 320, actual: 315 },
        { week: '2025-W01', capacity: 300, planned: 260, actual: 250 },
        { week: '2025-W02', capacity: Number.NaN, planned: 270, actual: 265 },
      ],
      overAllocatedWeeks: ['2025-W03', '2025-W03', '2025-W02'],
      projectBreakdown: [
        { projectId: 'p-2', projectName: 'Beta', planned: 180, actual: 160 },
        { projectId: 'p-1', projectName: 'Alpha', planned: 220, actual: 210 },
        { projectId: '', projectName: 'Ignored', planned: 0, actual: 0 },
      ],
    };

    fetchResourceAnalyticsSpy.mockResolvedValue(payload);

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useResourceAnalytics(baseParams), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchResourceAnalyticsSpy).toHaveBeenCalledWith(baseParams);

    const data = result.current.data;
    expect(data).toBeDefined();
    expect(data?.series.map((point) => point.week)).toEqual(['2025-W01', '2025-W02', '2025-W03']);
    expect(data?.series[1].capacity).toBe(0);
    expect(data?.overAllocatedWeeks).toEqual(['2025-W02', '2025-W03']);
    expect(data?.overAllocatedWeeksSet.has('2025-W03')).toBe(true);
    expect(data?.hasData).toBe(true);
    expect(data?.hasOverAllocation).toBe(true);
    expect(data?.range).toEqual({ fromWeek: '2025-W01', toWeek: '2025-W04' });
    expect(data?.scope).toEqual({ type: 'department', id: 'IT' });
    expect(data?.latestPoint).toMatchObject({ week: '2025-W03', planned: 320, actual: 315 });
    expect(data?.summary.totalCapacity).toBe(600);
    expect(data?.summary.totalPlanned).toBe(850);
    expect(data?.summary.totalActual).toBe(830);
    expect(data?.summary.weeks).toBe(3);
    expect(data?.summary.averageCapacity).toBeCloseTo(200, 5);
    expect(data?.summary.averagePlanned).toBeCloseTo(283.33, 2);
    expect(data?.summary.averageActual).toBeCloseTo(276.6667, 4);
    expect(data?.projectBreakdown).toEqual([
      { projectId: 'p-1', projectName: 'Alpha', planned: 220, actual: 210 },
      { projectId: 'p-2', projectName: 'Beta', planned: 180, actual: 160 },
    ]);
    expect(data?.projectBreakdownTotals).toEqual({ planned: 400, actual: 370 });
    expect(data?.cumulativeSeries).toEqual([
      { week: '2025-W01', capacity: 300, planned: 260, actual: 250 },
      { week: '2025-W02', capacity: 300, planned: 530, actual: 515 },
      { week: '2025-W03', capacity: 600, planned: 850, actual: 830 },
    ]);
    queryClient.clear();
  });

  it('keeps query idle when parameters are missing', () => {
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useResourceAnalytics(null), { wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.isFetching).toBe(false);
    expect(fetchResourceAnalyticsSpy).not.toHaveBeenCalled();
    expect(resourceAnalyticsKeys.detail(null)).toEqual(['resource-analytics', null, null, null, null]);
    queryClient.clear();
  });

  it('surfaces backend errors', async () => {
    fetchResourceAnalyticsSpy.mockRejectedValue(new Error('Network failure'));

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useResourceAnalytics(baseParams), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network failure');
    queryClient.clear();
  });
});






