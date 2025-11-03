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
      projectStackPlan: [
        {
          week: '2025-W02',
          projects: [
            { projectId: 'p-2', projectName: 'Beta', hours: 160 },
            { projectId: 'p-1', projectName: 'Alpha', hours: 190 },
          ],
        },
        {
          week: '2025-W01',
          projects: [
            { projectId: 'p-2', projectName: '', hours: 120 },
            { projectId: 'p-3', projectName: 'Gamma', hours: Number.NaN },
          ],
        },
      ],
      projectStackActual: [
        {
          week: '2025-W02',
          projects: [
            { projectId: 'p-2', projectName: 'Beta', hours: 158 },
            { projectId: 'p-1', projectName: 'Alpha', hours: 200 },
          ],
        },
        {
          week: '2025-W01',
          projects: [
            { projectId: 'p-3', projectName: 'Gamma', hours: 140 },
            { projectId: 'p-2', projectName: 'Beta', hours: 130 },
          ],
        },
      ],
      totals: { capacity: 905, planned: 850, actual: 840, baseline: 600 },
      baselineHoursWeek: 200,
      baselineTotalHours: 800,
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
    expect(data?.projectStackPlan).toEqual([
      {
        week: '2025-W01',
        projects: [
          { projectId: 'p-3', projectName: 'Gamma', hours: 0 },
          { projectId: 'p-2', projectName: 'Ukendt projekt', hours: 120 },
        ],
      },
      {
        week: '2025-W02',
        projects: [
          { projectId: 'p-1', projectName: 'Alpha', hours: 190 },
          { projectId: 'p-2', projectName: 'Beta', hours: 160 },
        ],
      },
    ]);
    expect(data?.projectStackActual).toEqual([
      {
        week: '2025-W01',
        projects: [
          { projectId: 'p-2', projectName: 'Beta', hours: 130 },
          { projectId: 'p-3', projectName: 'Gamma', hours: 140 },
        ],
      },
      {
        week: '2025-W02',
        projects: [
          { projectId: 'p-1', projectName: 'Alpha', hours: 200 },
          { projectId: 'p-2', projectName: 'Beta', hours: 158 },
        ],
      },
    ]);
    expect(data?.projectStackSeries).toEqual([
      {
        week: '2025-W01',
        baseline: 200,
        plannedTotal: 120,
        actualTotal: 270,
        planned: [
          { projectId: 'p-3', projectName: 'Gamma', hours: 0 },
          { projectId: 'p-2', projectName: 'Ukendt projekt', hours: 120 },
        ],
        actual: [
          { projectId: 'p-2', projectName: 'Beta', hours: 130 },
          { projectId: 'p-3', projectName: 'Gamma', hours: 140 },
        ],
      },
      {
        week: '2025-W02',
        baseline: 200,
        plannedTotal: 350,
        actualTotal: 358,
        planned: [
          { projectId: 'p-1', projectName: 'Alpha', hours: 190 },
          { projectId: 'p-2', projectName: 'Beta', hours: 160 },
        ],
        actual: [
          { projectId: 'p-1', projectName: 'Alpha', hours: 200 },
          { projectId: 'p-2', projectName: 'Beta', hours: 158 },
        ],
      },
    ]);
    expect(data?.projectStackTotals).toEqual([
      { projectId: 'p-2', projectName: 'Beta', planned: 280, actual: 288 },
      { projectId: 'p-1', projectName: 'Alpha', planned: 190, actual: 200 },
      { projectId: 'p-3', projectName: 'Gamma', planned: 0, actual: 140 },
    ]);
    expect(data?.totals).toEqual({ capacity: 905, planned: 850, actual: 840, baseline: 600 });
    expect(data?.baselineHoursWeek).toBe(200);
    expect(data?.baselineTotalHours).toBe(800);
    queryClient.clear();
  });

  it('returns empty stack collections when backend omits data', async () => {
    const payload: ResourceAnalyticsPayload = {
      scope: { type: 'department', id: 'IT' },
      series: [],
      overAllocatedWeeks: [],
      projectBreakdown: [],
      projectStackPlan: [],
      projectStackActual: [],
      totals: { capacity: 0, planned: 0, actual: 0, baseline: 0 },
      baselineHoursWeek: 0,
      baselineTotalHours: 0,
    };

    fetchResourceAnalyticsSpy.mockResolvedValue(payload);

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useResourceAnalytics(baseParams), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data;
    expect(data?.projectStackPlan).toEqual([]);
    expect(data?.projectStackActual).toEqual([]);
    expect(data?.projectStackSeries).toEqual([]);
    expect(data?.projectStackTotals).toEqual([]);
    expect(data?.baselineHoursWeek).toBe(0);
    expect(data?.baselineTotalHours).toBe(0);
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






