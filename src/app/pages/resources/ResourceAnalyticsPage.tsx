import { useMemo, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { ResourceSummaryCard, type ResourceSummaryTone } from '../../../components/ResourceSummaryCard';
import { RESOURCES_ANALYTICS_ENABLED } from '../../constants';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { useResourceAnalytics } from '../../../hooks/useResourceAnalytics';
import type { ResourceAnalyticsQuery } from '../../../types';
import { buildProjectStackChartConfig } from './resourceAnalyticsStacking';
import { formatHours, formatWeekLabel } from '../../../utils/format';
import { addWeeks, subtractWeeks, toIsoWeek, formatIsoWeekKey } from '../../../utils/date';
import { DEFAULT_WEEK_RANGE, ALL_DEPARTMENTS_OPTION } from './constants';
import type { RangeMode, ViewMode, AnalyticsRange } from './types';
import {
  FiltersPanel,
  AnalyticsContent,
  LoadingState,
  ErrorState,
  EmptyState,
  StackedProjectsCard,
  ProjectBreakdownSection,
} from './components';

const isAllDepartmentsValue = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }
  return (
    value === ALL_DEPARTMENTS_OPTION ||
    value === 'Alle afdelinger' ||
    value === '__ALL__' ||
    value === '_ALL_'
  );
};

const formatDepartmentLabel = (value: string | null | undefined) => {
  if (!value) {
    return 'Ingen afdeling';
  }
  if (isAllDepartmentsValue(value)) {
    return 'Alle afdelinger';
  }
  return value;
};

const deriveRange = (weeks: number, mode: RangeMode): AnalyticsRange => {
  const today = new Date();
  if (mode === 'future') {
    const fromWeek = formatIsoWeekKey(toIsoWeek(today));
    const endDate = addWeeks(today, Math.max(weeks - 1, 0));
    const toWeek = formatIsoWeekKey(toIsoWeek(endDate));
    return { fromWeek, toWeek };
  }
  const toWeek = formatIsoWeekKey(toIsoWeek(today));
  const startDate = subtractWeeks(today, Math.max(weeks - 1, 0));
  const fromWeek = formatIsoWeekKey(toIsoWeek(startDate));
  return { fromWeek, toWeek };
};

const ResourceAnalyticsBase = ({ variant }: { variant: 'page' | 'embedded' }) => {
  const projectManager = useProjectManager();
  const { logout, currentUser, isSaving, isWorkspaceFetching, apiError, isAdministrator, employees } = projectManager;
  const canAccessAnalytics = RESOURCES_ANALYTICS_ENABLED && isAdministrator;

  const departments = useMemo(() => {
    const unique = new Set<string>();
    employees.forEach((employee) => {
      if (employee.department && !isAllDepartmentsValue(employee.department)) {
        unique.add(employee.department);
      }
    });
    const sorted = Array.from(unique).sort((a, b) => a.localeCompare(b, 'da'));
    return [ALL_DEPARTMENTS_OPTION, ...sorted];
  }, [employees]);

  const [rangeWeeks, setRangeWeeks] = useState(DEFAULT_WEEK_RANGE);
  const [rangeMode, setRangeMode] = useState<RangeMode>('past');
  const [range, setRange] = useState<AnalyticsRange>(() => deriveRange(DEFAULT_WEEK_RANGE, 'past'));
  const [selectedDepartment, setSelectedDepartment] = useState<string>(ALL_DEPARTMENTS_OPTION);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showProjectBreakdown, setShowProjectBreakdown] = useState(true);
  const [showOverAllocated, setShowOverAllocated] = useState(false);

  const isFutureRange = rangeMode === 'future';

  useEffect(() => {
    if (!departments.length) {
      setSelectedDepartment('');
      return;
    }
    setSelectedDepartment((prev) => (prev && departments.includes(prev) ? prev : departments[0]));
  }, [departments]);

  useEffect(() => {
    setRange(deriveRange(rangeWeeks, rangeMode));
  }, [rangeWeeks, rangeMode]);

  const analyticsParams: ResourceAnalyticsQuery | null = selectedDepartment
    ? {
        scope: 'department',
        scopeId: selectedDepartment,
        ...range,
      }
    : null;

  const analyticsQuery = useResourceAnalytics(analyticsParams, {
    enabled: Boolean(analyticsParams),
    staleTime: 2 * 60 * 1000,
  });

  const { data, isPending, isFetching, isError, error, refetch } = analyticsQuery;
  const overAllocatedSet = data?.overAllocatedWeeksSet ?? new Set<string>();
  const overAllocatedCount = overAllocatedSet.size;
  const chartData = data?.series ?? [];
  const latestPoint = data?.latestPoint ?? chartData.at(-1) ?? null;
  const summary = data?.summary ?? null;
  const cumulativeSeries = data?.cumulativeSeries ?? [];
  const baselineHoursWeek = data?.baselineHoursWeek ?? 0;
  const baselineTotalHours =
    data?.baselineTotalHours ??
    (data?.totals && Number.isFinite(data.totals.baseline)
      ? Number(data.totals.baseline)
      : baselineHoursWeek * chartData.length);
  const projectBreakdown = data?.projectBreakdown ?? [];
  const projectBreakdownTotals = data?.projectBreakdownTotals ?? { planned: 0, actual: 0 };
  const canShowProjectBreakdown = variant === 'embedded' && projectBreakdown.length > 0;
  const projectStackChart = useMemo(() => {
    const series = data?.projectStackSeries ?? [];
    const totals = data?.projectStackTotals ?? [];
    return buildProjectStackChartConfig(series, totals, baselineHoursWeek);
  }, [baselineHoursWeek, data]);
  const showStackedProjects = variant === 'embedded' && projectStackChart.data.length > 0;
  const selectedDepartmentLabel = formatDepartmentLabel(selectedDepartment);

  useEffect(() => {
    if (overAllocatedCount === 0 && showOverAllocated) {
      setShowOverAllocated(false);
    }
  }, [overAllocatedCount, showOverAllocated]);

  if (!canAccessAnalytics) {
    return variant === 'page' ? <Navigate to="/" replace /> : null;
  }

  const summaryCards = (() => {
    if (!data) return [];
    if (viewMode === 'weekly') {
      const boundaryLabel = isFutureRange ? 'slutuge' : 'seneste uge';
      const cards = [
        {
          label: `Kapacitet (${boundaryLabel})`,
          value: formatHours(latestPoint?.capacity ?? 0),
          suffix: 'timer',
          helper: latestPoint ? formatWeekLabel(latestPoint.week) : undefined,
          tone: 'capacity' as ResourceSummaryTone,
        },
        {
          label: `Planlagt (${boundaryLabel})`,
          value: formatHours(latestPoint?.planned ?? 0),
          suffix: 'timer',
          helper: latestPoint ? formatWeekLabel(latestPoint.week) : undefined,
          tone: 'planned' as ResourceSummaryTone,
        },
        {
          label: `Faktisk (${boundaryLabel})`,
          value: formatHours(latestPoint?.actual ?? 0),
          suffix: 'timer',
          helper: latestPoint ? formatWeekLabel(latestPoint.week) : undefined,
          tone: 'actual' as ResourceSummaryTone,
        },
      ];
      if (baselineHoursWeek > 0) {
        cards.push({
          label: 'PMO baseline (uge)',
          value: formatHours(baselineHoursWeek),
          suffix: 'timer/uge',
          tone: 'baseline' as ResourceSummaryTone,
          helper: undefined,
        });
      }
      return cards;
    }

    const weeksDescriptor = `${range.fromWeek} → ${range.toWeek}`;
    const averagePrefix = isFutureRange ? 'Forventet gennemsnit:' : 'Historisk gennemsnit:';
    const capacityHelper = `${averagePrefix} ${formatHours(summary?.averageCapacity ?? 0)} timer/uge - ${weeksDescriptor}`;

    const cards = [
      {
        label: 'Kapacitet (total)',
        value: formatHours(summary?.totalCapacity ?? 0),
        suffix: 'timer',
        helper: capacityHelper,
        tone: 'capacity' as ResourceSummaryTone,
      },
      {
        label: 'Planlagt (total)',
        value: formatHours(summary?.totalPlanned ?? 0),
        suffix: 'timer',
        helper: `${averagePrefix} ${formatHours(summary?.averagePlanned ?? 0)} timer/uge`,
        tone: 'planned' as ResourceSummaryTone,
      },
      {
        label: 'Faktisk (total)',
        value: formatHours(summary?.totalActual ?? 0),
        suffix: 'timer',
        helper: `${averagePrefix} ${formatHours(summary?.averageActual ?? 0)} timer/uge`,
        tone: 'actual' as ResourceSummaryTone,
      },
    ];

    if (baselineHoursWeek > 0) {
      cards.push({
        label: 'PMO baseline (total)',
        value: formatHours(baselineTotalHours),
        suffix: 'timer',
        helper: `Baseline pr. uge: ${formatHours(baselineHoursWeek)} timer`,
        tone: 'baseline' as ResourceSummaryTone,
      });
    }

    return cards;
  })();

  const overAllocatedCard = overAllocatedCount > 0
    ? {
        label: 'Over-allokerede uger',
        value: `${overAllocatedCount}`,
        suffix: overAllocatedCount === 1 ? 'uge' : 'uger',
        tone: 'alert' as ResourceSummaryTone,
        helper: 'Reducer planlaegning for at undgaa overbelastning.',
      }
    : null;

  return (
    <div className="space-y-6">
      {variant === 'page' ? (
        <AppHeader
          title="Ressourcer"
          user={currentUser}
          isSaving={isSaving}
          isRefreshing={isWorkspaceFetching}
          apiError={apiError}
          onLogout={logout}
        >
          <button
            onClick={() => refetch()}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
            disabled={isFetching || isPending}
          >
            Opdater
          </button>
        </AppHeader>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => refetch()}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
            disabled={isFetching || isPending}
          >
            Opdater
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-blue-500/5 backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row">
          <FiltersPanel
            variant={variant}
            departments={departments}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
            rangeWeeks={rangeWeeks}
            onRangeWeeksChange={setRangeWeeks}
            rangeMode={rangeMode}
            onRangeModeChange={setRangeMode}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            renderDepartmentLabel={formatDepartmentLabel}
          />

          <div className="flex-1 space-y-6">
            {data && summaryCards.length > 0 && (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <ResourceSummaryCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    suffix={card.suffix}
                    tone={card.tone}
                    helper={card.helper}
                  />
                ))}
                {overAllocatedCard && (
                  <ResourceSummaryCard
                    label={overAllocatedCard.label}
                    value={overAllocatedCard.value}
                    suffix={overAllocatedCard.suffix}
                    tone={overAllocatedCard.tone}
                    helper={overAllocatedCard.helper}
                  />
                )}
              </section>
            )}

            {!departments.length ? (
              <EmptyState />
            ) : isPending ? (
              <LoadingState />
            ) : isError ? (
              <ErrorState message={error?.message ?? 'Kunne ikke hente data.'} onRetry={() => refetch()} />
            ) : (
              <>
                <AnalyticsContent
                  chartData={chartData}
                  baselineHoursWeek={baselineHoursWeek}
                  baselineTotalHours={baselineTotalHours}
                  cumulativeSeries={cumulativeSeries}
                  overAllocatedSet={overAllocatedSet}
                  isFetching={isFetching}
                  selectedDepartmentLabel={selectedDepartmentLabel}
                  range={range}
                  viewMode={viewMode}
                  summary={summary}
                  showOverAllocated={showOverAllocated}
                  onToggleOverAllocated={() => setShowOverAllocated((state) => !state)}
                />
                {showStackedProjects && (
                  <StackedProjectsCard
                    chart={projectStackChart}
                    baselineHoursWeek={baselineHoursWeek}
                    baselineTotalHours={baselineTotalHours}
                  />
                )}
                {canShowProjectBreakdown && (
                  <ProjectBreakdownSection
                    breakdown={projectBreakdown}
                    totals={projectBreakdownTotals}
                    isFetching={isFetching}
                    showBreakdown={showProjectBreakdown}
                    isAllDepartments={isAllDepartmentsValue(selectedDepartment)}
                    onToggle={() => setShowProjectBreakdown((state) => !state)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export const ResourceAnalyticsPage = () => <ResourceAnalyticsBase variant="page" />;

export const ResourceAnalyticsEmbeddedView = () => <ResourceAnalyticsBase variant="embedded" />;

export default ResourceAnalyticsPage;
