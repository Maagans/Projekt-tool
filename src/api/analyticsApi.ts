// src/api/analyticsApi.ts
// Resource analytics for capacity planning
import type {
    ResourceAnalyticsQuery,
    ResourceAnalyticsPayload,
    ResourceAnalyticsStackEntry,
    ResourceAnalyticsStackProject,
    ResourceAnalyticsTotals,
} from '../types';
import { fetchWithAuth } from './client';

type ResourceAnalyticsApiResponse =
    | { success: true; data: ResourceAnalyticsPayload }
    | { success: false; message?: string }
    | ResourceAnalyticsPayload;

const normalizeStackEntries = (stack: unknown[]): ResourceAnalyticsStackEntry[] => {
    if (!Array.isArray(stack)) {
        return [];
    }

    return stack
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null;
            }

            const week = typeof (entry as { week?: unknown }).week === 'string' ? (entry as { week: string }).week : '';
            if (!week) {
                return null;
            }

            const projectsRaw = Array.isArray((entry as { projects?: unknown }).projects)
                ? (entry as { projects: unknown[] }).projects
                : [];

            const projects = projectsRaw
                .map((project) => {
                    if (!project || typeof project !== 'object') {
                        return null;
                    }
                    const projectId =
                        typeof (project as { projectId?: unknown }).projectId === 'string'
                            ? (project as { projectId: string }).projectId
                            : '';
                    if (!projectId) {
                        return null;
                    }
                    const projectName =
                        typeof (project as { projectName?: unknown }).projectName === 'string'
                            ? (project as { projectName: string }).projectName.trim() || 'Ukendt projekt'
                            : 'Ukendt projekt';
                    const hoursValue = (project as { hours?: unknown }).hours;
                    const hours = Number.isFinite(hoursValue) ? Number(hoursValue) : 0;
                    return { projectId, projectName, hours };
                })
                .filter((project): project is ResourceAnalyticsStackProject => project !== null)
                .sort((a, b) => a.projectName.localeCompare(b.projectName, 'da', { sensitivity: 'base' }));

            return { week, projects };
        })
        .filter((entry): entry is ResourceAnalyticsStackEntry => entry !== null)
        .sort((a, b) => a.week.localeCompare(b.week));
};

const normalizeResourceAnalyticsPayload = (payload: ResourceAnalyticsPayload): ResourceAnalyticsPayload => {
    const series = Array.isArray(payload.series) ? payload.series : [];
    const normalizedSeries = series.map((point) => ({
        week: point.week ?? '',
        capacity: Number(point.capacity ?? 0),
        planned: Number(point.planned ?? 0),
        actual: Number(point.actual ?? 0),
    }));

    const totalsFromSeries = normalizedSeries.reduce(
        (acc, point) => ({
            capacity: acc.capacity + point.capacity,
            planned: acc.planned + point.planned,
            actual: acc.actual + point.actual,
        }),
        { capacity: 0, planned: 0, actual: 0 },
    );

    const overAllocatedWeeks = Array.isArray(payload.overAllocatedWeeks)
        ? payload.overAllocatedWeeks.filter((week): week is string => typeof week === 'string')
        : [];

    const projectBreakdown = Array.isArray(payload.projectBreakdown)
        ? payload.projectBreakdown
            .map((item) => ({
                projectId: typeof item.projectId === 'string' ? item.projectId : '',
                projectName:
                    typeof item.projectName === 'string' && item.projectName.trim().length > 0
                        ? item.projectName
                        : 'Ukendt projekt',
                planned: Number(item.planned ?? 0),
                actual: Number(item.actual ?? 0),
            }))
            .filter((item) => item.projectId)
        : [];

    const projectStackPlan = normalizeStackEntries((payload as { projectStackPlan?: unknown[] }).projectStackPlan ?? []);
    const projectStackActual = normalizeStackEntries(
        (payload as { projectStackActual?: unknown[] }).projectStackActual ?? [],
    );

    const totalsRaw = (payload as { totals?: Partial<ResourceAnalyticsTotals> }).totals ?? {};
    const totals: ResourceAnalyticsTotals = {
        capacity: Number.isFinite(totalsRaw.capacity) ? Number(totalsRaw.capacity) : totalsFromSeries.capacity,
        planned: Number.isFinite(totalsRaw.planned) ? Number(totalsRaw.planned) : totalsFromSeries.planned,
        actual: Number.isFinite(totalsRaw.actual) ? Number(totalsRaw.actual) : totalsFromSeries.actual,
        baseline: Number.isFinite(totalsRaw.baseline) ? Number(totalsRaw.baseline) : 0,
    };

    const baselineHoursWeek = Number.isFinite((payload as { baselineHoursWeek?: unknown }).baselineHoursWeek)
        ? Number((payload as { baselineHoursWeek: number }).baselineHoursWeek)
        : 0;
    const baselineTotalHours = Number.isFinite((payload as { baselineTotalHours?: unknown }).baselineTotalHours)
        ? Number((payload as { baselineTotalHours: number }).baselineTotalHours)
        : totals.baseline;

    return {
        scope: {
            type: payload.scope?.type ?? 'department',
            id: payload.scope?.id ?? '',
        },
        series: normalizedSeries,
        overAllocatedWeeks,
        projectBreakdown,
        projectStackPlan,
        projectStackActual,
        totals,
        baselineHoursWeek,
        baselineTotalHours,
    };
};

export const analyticsApi = {
    async fetchResourceAnalytics(params: ResourceAnalyticsQuery): Promise<ResourceAnalyticsPayload> {
        const { scope, scopeId, fromWeek, toWeek } = params;

        if (!scope || !scopeId || !fromWeek || !toWeek) {
            throw new Error('Alle parametre (scope, scopeId, fromWeek, toWeek) er påkrævet.');
        }

        const query = new URLSearchParams({
            scope,
            scopeId,
            fromWeek,
            toWeek,
        });

        const response = (await fetchWithAuth(`/api/analytics/resources?${query.toString()}`)) as ResourceAnalyticsApiResponse;

        if ('success' in response) {
            if (!response.success) {
                throw new Error(response.message ?? 'Kunne ikke hente resource analytics.');
            }
            return normalizeResourceAnalyticsPayload(response.data);
        }

        return normalizeResourceAnalyticsPayload(response);
    },
};
