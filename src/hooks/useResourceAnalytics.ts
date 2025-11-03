import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { api } from '../api';
import type {
  ResourceAnalyticsPayload,
  ResourceAnalyticsPoint,
  ResourceAnalyticsProjectBreakdownItem,
  ResourceAnalyticsQuery,
  ResourceAnalyticsStackEntry,
  ResourceAnalyticsStackProject,
  ResourceAnalyticsTotals,
} from '../types';

export interface ResourceAnalyticsCumulativePoint {
  week: string;
  capacity: number;
  planned: number;
  actual: number;
}

export interface ResourceAnalyticsSummary {
  totalCapacity: number;
  totalPlanned: number;
  totalActual: number;
  averageCapacity: number;
  averagePlanned: number;
  averageActual: number;
  weeks: number;
}

export interface ResourceAnalyticsStackedProjectTotals {
  projectId: string;
  projectName: string;
  planned: number;
  actual: number;
}

export interface ResourceAnalyticsStackedWeek {
  week: string;
  baseline: number;
  plannedTotal: number;
  actualTotal: number;
  planned: ResourceAnalyticsStackProject[];
  actual: ResourceAnalyticsStackProject[];
}

export interface NormalizedResourceAnalytics extends ResourceAnalyticsPayload {
  range: {
    fromWeek: string;
    toWeek: string;
  };
  overAllocatedWeeksSet: Set<string>;
  hasData: boolean;
  hasOverAllocation: boolean;
  latestPoint: ResourceAnalyticsPoint | null;
  summary: ResourceAnalyticsSummary;
  cumulativeSeries: ResourceAnalyticsCumulativePoint[];
  projectBreakdown: ResourceAnalyticsProjectBreakdownItem[];
  projectBreakdownTotals: {
    planned: number;
    actual: number;
  };
  projectStackPlan: ResourceAnalyticsStackEntry[];
  projectStackActual: ResourceAnalyticsStackEntry[];
  projectStackSeries: ResourceAnalyticsStackedWeek[];
  projectStackTotals: ResourceAnalyticsStackedProjectTotals[];
  totals: ResourceAnalyticsTotals;
  baselineHoursWeek: number;
  baselineTotalHours: number;
}

export type UseResourceAnalyticsResult = UseQueryResult<NormalizedResourceAnalytics, Error>;

export const resourceAnalyticsKeys = {
  all: ['resource-analytics'] as const,
  detail: (params: ResourceAnalyticsQuery | null | undefined) =>
    [
      'resource-analytics',
      params?.scope ?? null,
      params?.scopeId ?? null,
      params?.fromWeek ?? null,
      params?.toWeek ?? null,
    ] as const,
};

const normalizeAnalytics = (
  payload: ResourceAnalyticsPayload,
  params: ResourceAnalyticsQuery,
): NormalizedResourceAnalytics => {
  const orderedSeries = [...payload.series].sort((a, b) => a.week.localeCompare(b.week));

  const sanitizedSeries = orderedSeries.map((point) => ({
    week: point.week,
    capacity: Number.isFinite(point.capacity) ? point.capacity : 0,
    planned: Number.isFinite(point.planned) ? point.planned : 0,
    actual: Number.isFinite(point.actual) ? point.actual : 0,
  }));

  const overAllocatedWeeksSet = new Set(
    (payload.overAllocatedWeeks ?? []).filter((week): week is string => typeof week === 'string'),
  );
  const overAllocatedWeeks = Array.from(overAllocatedWeeksSet).sort((a, b) => a.localeCompare(b));

  const hasData = sanitizedSeries.length > 0;
  const hasOverAllocation = overAllocatedWeeksSet.size > 0;
  const latestPoint = hasData ? sanitizedSeries[sanitizedSeries.length - 1] : null;

  const seriesTotals = sanitizedSeries.reduce(
    (acc, point) => ({
      capacity: acc.capacity + point.capacity,
      planned: acc.planned + point.planned,
      actual: acc.actual + point.actual,
    }),
    { capacity: 0, planned: 0, actual: 0 },
  );

  let cumulativeCapacity = 0;
  let cumulativePlanned = 0;
  let cumulativeActual = 0;
  const cumulativeSeries: ResourceAnalyticsCumulativePoint[] = sanitizedSeries.map((point) => {
    cumulativeCapacity += point.capacity;
    cumulativePlanned += point.planned;
    cumulativeActual += point.actual;
    return {
      week: point.week,
      capacity: cumulativeCapacity,
      planned: cumulativePlanned,
      actual: cumulativeActual,
    };
  });

  const weeks = sanitizedSeries.length;
  const summary: ResourceAnalyticsSummary = {
    totalCapacity: seriesTotals.capacity,
    totalPlanned: seriesTotals.planned,
    totalActual: seriesTotals.actual,
    averageCapacity: weeks > 0 ? seriesTotals.capacity / weeks : 0,
    averagePlanned: weeks > 0 ? seriesTotals.planned / weeks : 0,
    averageActual: weeks > 0 ? seriesTotals.actual / weeks : 0,
    weeks,
  };

  const projectBreakdown = Array.isArray(payload.projectBreakdown)
    ? payload.projectBreakdown
        .map((item) => ({
          projectId: typeof item.projectId === 'string' ? item.projectId : '',
          projectName:
            typeof item.projectName === 'string' && item.projectName.trim().length > 0
              ? item.projectName
              : 'Ukendt projekt',
          planned: Number.isFinite(item.planned) ? Number(item.planned) : 0,
          actual: Number.isFinite(item.actual) ? Number(item.actual) : 0,
        }))
        .filter((item) => item.projectId && (item.planned !== 0 || item.actual !== 0))
        .sort((a, b) => b.planned + b.actual - (a.planned + a.actual))
    : [];

  const projectBreakdownTotals = projectBreakdown.reduce(
    (acc, item) => ({
      planned: acc.planned + item.planned,
      actual: acc.actual + item.actual,
    }),
    { planned: 0, actual: 0 },
  );

  const sanitizeStack = (stack: ResourceAnalyticsStackEntry[]): ResourceAnalyticsStackEntry[] =>
    stack
      .map((entry) => ({
        week: entry.week,
        projects: entry.projects
          .map((project) => ({
            projectId: project.projectId,
            projectName: project.projectName || 'Ukendt projekt',
            hours: Number.isFinite(project.hours) ? project.hours : 0,
          }))
          .filter((project) => project.projectId)
          .sort((a, b) => a.projectName.localeCompare(b.projectName, 'da', { sensitivity: 'base' })),
      }))
      .filter((entry) => entry.week)
      .sort((a, b) => a.week.localeCompare(b.week));

  const projectStackPlan = sanitizeStack(payload.projectStackPlan ?? []);
  const projectStackActual = sanitizeStack(payload.projectStackActual ?? []);

  const totals: ResourceAnalyticsTotals = {
    capacity: Number.isFinite(payload.totals?.capacity) ? Number(payload.totals?.capacity) : seriesTotals.capacity,
    planned: Number.isFinite(payload.totals?.planned) ? Number(payload.totals?.planned) : seriesTotals.planned,
    actual: Number.isFinite(payload.totals?.actual) ? Number(payload.totals?.actual) : seriesTotals.actual,
    baseline: Number.isFinite(payload.totals?.baseline) ? Number(payload.totals?.baseline) : 0,
  };

  const baselineHoursWeek = Number.isFinite(payload.baselineHoursWeek) ? Number(payload.baselineHoursWeek) : 0;
  const baselineTotalHours = Number.isFinite(payload.baselineTotalHours)
    ? Number(payload.baselineTotalHours)
    : totals.baseline;

  const projectStackPlanByWeek = new Map(projectStackPlan.map((entry) => [entry.week, entry]));
  const projectStackActualByWeek = new Map(projectStackActual.map((entry) => [entry.week, entry]));
  const stackWeekKeys = new Set<string>([
    ...projectStackPlanByWeek.keys(),
    ...projectStackActualByWeek.keys(),
  ]);
  const orderedStackWeeks = Array.from(stackWeekKeys).sort((a, b) => a.localeCompare(b));

  const stackTotalsMap = new Map<string, ResourceAnalyticsStackedProjectTotals>();
  const projectStackSeries: ResourceAnalyticsStackedWeek[] = orderedStackWeeks.map((week) => {
    const plannedProjects = projectStackPlanByWeek.get(week)?.projects ?? [];
    const actualProjects = projectStackActualByWeek.get(week)?.projects ?? [];

    plannedProjects.forEach((project) => {
      const existing =
        stackTotalsMap.get(project.projectId) ??
        {
          projectId: project.projectId,
          projectName: project.projectName,
          planned: 0,
          actual: 0,
        };
      existing.projectName = project.projectName || existing.projectName;
      existing.planned += project.hours;
      stackTotalsMap.set(project.projectId, existing);
    });

    actualProjects.forEach((project) => {
      const existing =
        stackTotalsMap.get(project.projectId) ??
        {
          projectId: project.projectId,
          projectName: project.projectName,
          planned: 0,
          actual: 0,
        };
      existing.projectName = project.projectName || existing.projectName;
      existing.actual += project.hours;
      stackTotalsMap.set(project.projectId, existing);
    });

    const plannedTotal = plannedProjects.reduce((acc, project) => acc + project.hours, 0);
    const actualTotal = actualProjects.reduce((acc, project) => acc + project.hours, 0);

    return {
      week,
      baseline: baselineHoursWeek,
      plannedTotal,
      actualTotal,
      planned: plannedProjects,
      actual: actualProjects,
    };
  });

  const projectStackTotals = Array.from(stackTotalsMap.values()).sort((a, b) => {
    const totalA = a.planned + a.actual;
    const totalB = b.planned + b.actual;
    if (totalA === totalB) {
      return a.projectName.localeCompare(b.projectName, 'da', { sensitivity: 'base' });
    }
    return totalB - totalA;
  });

  return {
    scope: payload.scope,
    series: sanitizedSeries,
    overAllocatedWeeks,
    overAllocatedWeeksSet,
    hasData,
    hasOverAllocation,
    range: {
      fromWeek: params.fromWeek,
      toWeek: params.toWeek,
    },
    latestPoint,
    summary,
    cumulativeSeries,
    projectBreakdown,
    projectBreakdownTotals,
    projectStackPlan,
    projectStackActual,
    projectStackSeries,
    projectStackTotals,
    totals,
    baselineHoursWeek,
    baselineTotalHours,
  };
};

export const useResourceAnalytics = (
  params: ResourceAnalyticsQuery | null | undefined,
  options?: Partial<UseQueryOptions<NormalizedResourceAnalytics, Error, NormalizedResourceAnalytics>>,
): UseResourceAnalyticsResult => {
  const hasCompleteParams = Boolean(
    params?.scope && params.scopeId && params.fromWeek && params.toWeek,
  );
  const enabled = options?.enabled ?? hasCompleteParams;
  const staleTime = options?.staleTime ?? 5 * 60 * 1000; // 5 minutes

  return useQuery<NormalizedResourceAnalytics, Error, NormalizedResourceAnalytics>({
    queryKey: resourceAnalyticsKeys.detail(params),
    queryFn: async () => {
      if (!params) {
        throw new Error('Analytics parametre mangler.');
      }
      const payload = await api.fetchResourceAnalytics(params);
      return normalizeAnalytics(payload, params);
    },
    ...options,
    enabled,
    staleTime,
  });
};
