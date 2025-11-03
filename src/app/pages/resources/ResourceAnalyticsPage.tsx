import { useMemo, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AppHeader } from '../../components/AppHeader';
import { ResourceSummaryCard, type ResourceSummaryTone } from '../../../components/ResourceSummaryCard';
import { RESOURCES_ANALYTICS_ENABLED } from '../../constants';
import { useProjectManager } from '../../../hooks/useProjectManager';
import {
  useResourceAnalytics,
  type ResourceAnalyticsCumulativePoint,
  type ResourceAnalyticsSummary,
} from '../../../hooks/useResourceAnalytics';
import type { ResourceAnalyticsQuery } from '../../../types';
import {
  buildProjectStackChartConfig,
  applyAlpha,
  type ProjectStackChartConfig,
  type StackAreaConfig,
  type StackLegendEntry,
  type ProjectStackChartPoint,
} from './resourceAnalyticsStacking';

const DEFAULT_WEEK_RANGE = 12;
const RANGE_OPTIONS = [6, 12, 24, 52] as const;
type ViewMode = 'weekly' | 'summary' | 'cumulative';
const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'weekly', label: 'Ugentlig' },
  { value: 'summary', label: 'Opsummeret' },
  { value: 'cumulative', label: 'Kumulativ' },
];
const ALL_DEPARTMENTS_OPTION = '__ALL__';

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toIsoWeek = (dateInput: Date): { year: number; week: number } => {
  const date = startOfUtcDay(dateInput);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = Number(date) - Number(yearStart);
  const week = Math.ceil((diff / MS_PER_DAY + 1) / 7);
  return { year: date.getUTCFullYear(), week };
};

const formatIsoWeekKey = ({ year, week }: { year: number; week: number }) => `${year}-W${String(week).padStart(2, '0')}`;

const subtractWeeks = (date: Date, weeks: number) => {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() - weeks * 7);
  return result;
};

const deriveDefaultRange = (weeks: number) => {
  const today = new Date();
  const toWeekKey = formatIsoWeekKey(toIsoWeek(today));
  const startDate = subtractWeeks(today, Math.max(weeks - 1, 0));
  const fromWeekKey = formatIsoWeekKey(toIsoWeek(startDate));
  return { fromWeek: fromWeekKey, toWeek: toWeekKey };
};

const formatWeekLabel = (weekKey: string) => {
  const [yearPart, weekPart] = weekKey.split('-W');
  if (!yearPart || !weekPart) {
    return weekKey;
  }
  return `Uge ${Number(weekPart)} (${yearPart})`;
};

const formatHours = (value: number) =>
  new Intl.NumberFormat('da-DK', { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(value);

const ResourceAnalyticsBase = ({ variant }: { variant: 'page' | 'embedded' }) => {
  const projectManager = useProjectManager();
  const navigate = useNavigate();
  const { logout, currentUser, isSaving, apiError, isAdministrator, employees } = projectManager;
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

  const [rangeWeeks, setRangeWeeks] = useState<number>(DEFAULT_WEEK_RANGE);
  const [range, setRange] = useState(() => deriveDefaultRange(DEFAULT_WEEK_RANGE));
  const [selectedDepartment, setSelectedDepartment] = useState<string>(ALL_DEPARTMENTS_OPTION);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showProjectBreakdown, setShowProjectBreakdown] = useState(true);
  const [showOverAllocated, setShowOverAllocated] = useState(false);

  useEffect(() => {
    if (!departments.length) {
      setSelectedDepartment('');
      return;
    }
    setSelectedDepartment((prev) => (prev && departments.includes(prev) ? prev : departments[0]));
  }, [departments]);

  useEffect(() => {
    setRange(deriveDefaultRange(rangeWeeks));
  }, [rangeWeeks]);

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
      const cards = [
        {
          label: 'Kapacitet (seneste uge)',
          value: formatHours(latestPoint?.capacity ?? 0),
          suffix: 'timer',
          tone: 'capacity' as ResourceSummaryTone,
          helper: latestPoint ? formatWeekLabel(latestPoint.week) : undefined,
        },
        {
          label: 'Planlagt (seneste uge)',
          value: formatHours(latestPoint?.planned ?? 0),
          suffix: 'timer',
          tone: getSummaryTone(latestPoint?.planned ?? 0, latestPoint?.capacity ?? 0, 'planned'),
          helper: latestPoint ? formatWeekLabel(latestPoint.week) : undefined,
        },
        {
          label: 'Faktisk (seneste uge)',
          value: formatHours(latestPoint?.actual ?? 0),
          suffix: 'timer',
          tone: getSummaryTone(latestPoint?.actual ?? 0, latestPoint?.capacity ?? 0, 'actual'),
          helper: latestPoint ? formatWeekLabel(latestPoint.week) : undefined,
        },
      ];
      cards.push({
        label: 'PMO baseline (uge)',
        value: formatHours(baselineHoursWeek),
        suffix: 'timer/uge',
        tone: 'baseline' as ResourceSummaryTone,
        helper:
          baselineTotalHours > 0
            ? `Totalt: ${formatHours(baselineTotalHours)} timer`
            : 'Fastlagt af PMO',
      });
      return cards;
    }
    if (!summary) return [];
    const labelPrefix = viewMode === 'cumulative' ? 'Kumulativ ' : 'Total ';
    const helperSuffix = `Gns. ${formatHours(summary.averageCapacity)} timer/uge - ${summary.weeks} uger`;
    const cards = [
      {
        label: `${labelPrefix}kapacitet`,
        value: formatHours(summary.totalCapacity),
        suffix: 'timer',
        tone: 'capacity' as ResourceSummaryTone,
        helper: helperSuffix,
      },
      {
        label: `${labelPrefix}planlagt`,
        value: formatHours(summary.totalPlanned),
        suffix: 'timer',
        tone: getSummaryTone(summary.totalPlanned, summary.totalCapacity, 'planned'),
        helper: `Gns. ${formatHours(summary.averagePlanned)} timer/uge`,
      },
      {
        label: `${labelPrefix}faktisk`,
        value: formatHours(summary.totalActual),
        suffix: 'timer',
        tone: getSummaryTone(summary.totalActual, summary.totalCapacity, 'actual'),
        helper: `Gns. ${formatHours(summary.averageActual)} timer/uge`,
      },
    ];
    cards.push({
      label: `${labelPrefix}baseline`,
      value: formatHours(baselineTotalHours),
      suffix: 'timer',
      tone: 'baseline' as ResourceSummaryTone,
      helper: `Baseline pr. uge: ${formatHours(baselineHoursWeek)} timer`,
    });
    return cards;
  })();

  const overAllocatedCard = data
    ? {
        label: viewMode === 'weekly' ? 'Over-allokerede uger' : 'Over-allokerede uger i perioden',
        value: overAllocatedSet.size.toString(),
        suffix: 'uger',
        tone: overAllocatedSet.size > 0 ? ('alert' as ResourceSummaryTone) : ('capacity' as ResourceSummaryTone),
        helper: viewMode === 'weekly' ? 'Seneste periode' : 'Valgt periode',
      }
    : null;

  return (
    <div className={variant === 'page' ? 'space-y-8' : 'space-y-6'}>
      {variant === 'page' ? (
        <AppHeader title="Ressource Analytics" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
            >
              Tilbage til Dashboard
            </button>
            <button
              onClick={() => refetch()}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
              disabled={isFetching || isPending}
            >
              Opdater
            </button>
          </div>
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

      <section className="space-y-6 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-blue-500/5 backdrop-blur">
        <section className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="department-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Afdeling
            </label>
            <select
              id="department-select"
              className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
              disabled={!departments.length}
            >
              {departments.length > 0 ? (
                departments.map((department) => (
                  <option key={department} value={department}>
                    {formatDepartmentLabel(department)}
                  </option>
                ))
              ) : (
                <option>Ingen afdelinger fundet</option>
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</span>
            <div className="flex items-center gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    rangeWeeks === option
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                  onClick={() => setRangeWeeks(option)}
                >
                  {option} uger
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visning</span>
            <div className="flex items-center gap-2">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    viewMode === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                  onClick={() => setViewMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

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
      </section>
    </div>
  );
};

export const ResourceAnalyticsPage = () => <ResourceAnalyticsBase variant="page" />;

export const ResourceAnalyticsEmbeddedView = () => <ResourceAnalyticsBase variant="embedded" />;

const getSummaryTone = (value: number, capacity: number, fallback: ResourceSummaryTone): ResourceSummaryTone => {
  if (!Number.isFinite(value) || !Number.isFinite(capacity)) {
    return fallback;
  }
  return value > capacity ? 'alert' : fallback;
};

const PROJECT_COLORS = ['#2563eb', '#7c3aed', '#ef4444', '#10b981', '#f97316', '#0ea5e9', '#8b5cf6', '#f59e0b'];

type BreakdownItem = {
  projectId: string;
  projectName: string;
  planned: number;
  actual: number;
};

type BreakdownTotals = {
  planned: number;
  actual: number;
};

const buildChartItems = (breakdown: BreakdownItem[], key: 'planned' | 'actual', total: number) =>
  breakdown.map((item, index) => {
    const value = item[key];
    const percent = total > 0 ? Math.max((value / total) * 100, 0) : 0;
    return {
      id: item.projectId,
      label: item.projectName,
      value,
      percent,
      percentLabel: `${percent.toFixed(1)}%`,
      color: PROJECT_COLORS[index % PROJECT_COLORS.length],
    };
  });

const StackedProjectsCard = ({
  chart,
  baselineHoursWeek,
  baselineTotalHours,
}: {
  chart: ProjectStackChartConfig;
  baselineHoursWeek: number;
  baselineTotalHours: number;
}) => {
  const areaMeta = new Map<string, StackAreaConfig>();
  [...chart.plannedAreas, ...chart.actualAreas].forEach((area) => {
    areaMeta.set(area.dataKey, area);
  });

  return (
    <section
      className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
      data-testid="stacked-projects-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Stacked belastning pr. projekt</h3>
          <p className="mt-1 text-sm text-slate-500">
            Viser planlagt og faktisk tid pr. projekt for den valgte periode. Projekter sorteres efter samlet belastning.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
          {baselineHoursWeek > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
              Baseline: {formatHours(baselineHoursWeek)} t/uge
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
              Baseline ikke sat
            </span>
          )}
          <span>
            Total baseline: <strong>{formatHours(baselineTotalHours)} timer</strong>
          </span>
        </div>
      </header>

      <div className="h-96 w-full rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart.data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
            <XAxis dataKey="week" tickFormatter={formatWeekLabel} stroke="#475569" minTickGap={12} />
            <YAxis stroke="#475569" tickFormatter={formatHours} />
            {baselineHoursWeek > 0 &&
              chart.overBaselineRanges.map((range) => (
                <ReferenceArea
                  key={`${range.start}-${range.end}`}
                  x1={range.start}
                  x2={range.end}
                  fill="#fee2e2"
                  fillOpacity={0.25}
                  strokeOpacity={0}
                />
              ))}
            {baselineHoursWeek > 0 && (
              <ReferenceLine
                y={baselineHoursWeek}
                stroke="#4338ca"
                strokeWidth={2}
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
                label={{
                  position: 'right',
                  value: `Baseline ${formatHours(baselineHoursWeek)} t/uge`,
                  fill: '#4338ca',
                  fontSize: 12,
                }}
              />
            )}
            <Tooltip content={<StackedTooltip meta={areaMeta} baseline={baselineHoursWeek} />} />
            {chart.plannedAreas.map((area) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                stackId="planned"
                stroke={applyAlpha(area.color, 0.8)}
                fill={applyAlpha(area.color, 0.35)}
                fillOpacity={1}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            ))}
            {chart.actualAreas.map((area) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                stackId="actual"
                stroke={area.color}
                fill={applyAlpha(area.color, 0.65)}
                fillOpacity={1}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <StackedLegend entries={chart.legendEntries} />

      <OverBaselineBadges weeks={chart.overBaselineWeeks} baselineHoursWeek={baselineHoursWeek} />
    </section>
  );
};

const StackedLegend = ({ entries }: { entries: StackLegendEntry[] }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
    <h3 className="text-sm font-semibold text-slate-700">Projektoversigt</h3>
    {entries.length === 0 ? (
      <p className="mt-2 text-sm text-slate-500">Ingen projekter har registreret tid i perioden.</p>
    ) : (
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {entries.map((entry) => (
          <li
            key={`legend-${entry.projectId}`}
            className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.projectName}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Total: {formatHours(entry.planned + entry.actual)} t
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div className="flex flex-col gap-0.5">
                <dt>Planlagt</dt>
                <dd className="font-semibold text-slate-700">{formatHours(entry.planned)} t</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt>Faktisk</dt>
                <dd className="font-semibold text-slate-700">{formatHours(entry.actual)} t</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    )}
  </div>
);

type ChartTooltipEntry = {
  value?: number;
  dataKey?: string | number;
  payload?: ProjectStackChartPoint;
};

type StackedTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
  meta: Map<string, StackAreaConfig>;
  baseline: number;
};

const StackedTooltip = ({
  active,
  payload,
  label,
  meta,
  baseline,
}: StackedTooltipProps) => {
  const rows = payload ?? [];
  if (!active || rows.length === 0) {
    return null;
  }

  const plannedRows: Array<{ name: string; value: number; color: string }> = [];
  const actualRows: Array<{ name: string; value: number; color: string }> = [];

  rows.forEach((item) => {
    if (!item || typeof item.value !== 'number' || !item.dataKey) {
      return;
    }
    const area = meta.get(String(item.dataKey));
    if (!area) {
      return;
    }
    const row = {
      name: area.projectName,
      value: item.value,
      color: area.color,
    };
    if (area.variant === 'planned') {
      plannedRows.push(row);
    } else {
      actualRows.push(row);
    }
  });

  plannedRows.sort((a, b) => b.value - a.value);
  actualRows.sort((a, b) => b.value - a.value);

  const dataPoint = rows[0]?.payload as ProjectStackChartPoint | undefined;
  const plannedTotal = dataPoint?.plannedTotal ?? plannedRows.reduce((acc, row) => acc + row.value, 0);
  const actualTotal = dataPoint?.actualTotal ?? actualRows.reduce((acc, row) => acc + row.value, 0);
  const overBaseline = baseline > 0 && actualTotal > baseline;
  const baselineDiff = overBaseline ? actualTotal - baseline : baseline - actualTotal;

  const renderRows = (rows: Array<{ name: string; value: number; color: string }>) => (
    <ul className="mt-1 space-y-1">
      {rows.map((row) => (
        <li key={`${row.name}-${row.color}`} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }}></span>
            {row.name}
          </span>
          <span className="font-semibold text-slate-700">{formatHours(row.value)} t</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-w-[240px] rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-lg">
      <div className="text-sm font-semibold text-slate-700">{formatWeekLabel(String(label))}</div>
      <div className="mt-3 space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-wide text-amber-600">
            Planlagt ({formatHours(plannedTotal)} t)
          </div>
          {plannedRows.length > 0 ? renderRows(plannedRows) : <div className="mt-1 text-slate-400">Ingen registreringer</div>}
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-wide text-emerald-600">
            Faktisk ({formatHours(actualTotal)} t)
          </div>
          {actualRows.length > 0 ? renderRows(actualRows) : <div className="mt-1 text-slate-400">Ingen registreringer</div>}
        </div>
      </div>
      {baseline > 0 && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
            overBaseline ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          Baseline {overBaseline ? 'overskredet' : 'under'} med {formatHours(baselineDiff)} t
        </div>
      )}
    </div>
  );
};

const OverBaselineBadges = ({
  weeks,
  baselineHoursWeek,
}: {
  weeks: string[];
  baselineHoursWeek: number;
}) => {
  const sortedWeeks = [...weeks].sort((a, b) => a.localeCompare(b));
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5" data-testid="overbaseline-list">
      <h3 className="text-sm font-semibold text-indigo-700">Uger over baseline</h3>
      {baselineHoursWeek <= 0 ? (
        <p className="mt-2 text-sm text-indigo-600">Definer en baseline for at spore belastningen uge for uge.</p>
      ) : sortedWeeks.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Ingen uger overskrider baseline i den valgte periode.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {sortedWeeks.map((week) => (
            <li
              key={`baseline-${week}`}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-600"
            >
              {formatWeekLabel(week)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ProjectBreakdownSection = ({
  breakdown,
  totals,
  isFetching,
  showBreakdown,
  isAllDepartments,
  onToggle,
}: {
  breakdown: BreakdownItem[];
  totals: BreakdownTotals;
  isFetching: boolean;
  showBreakdown: boolean;
  isAllDepartments: boolean;
  onToggle: () => void;
}) => {
  const plannedItems = buildChartItems(breakdown, 'planned', totals.planned);
  const actualItems = buildChartItems(breakdown, 'actual', totals.actual);
  const toggleLabel = showBreakdown ? 'Skjul projektfordeling' : 'Vis projektfordeling';

  return (
    <section className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-700">Projektfordeling</h3>
          <p className="text-sm text-slate-500">
            {isAllDepartments
              ? 'Fordeling af planlagt og faktisk tid på aktive projekter på tværs af alle afdelinger.'
              : 'Fordeling af planlagt og faktisk tid på aktive projekter for den valgte afdeling.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={showBreakdown}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            showBreakdown
              ? 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
              : 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
          }`}
        >
          {toggleLabel}
        </button>
      </header>

      {showBreakdown && (
        <div className="grid gap-8 lg:grid-cols-2">
          <ProjectDistributionPie
            title="Planlagt tid"
            items={plannedItems}
            total={totals.planned}
            isLoading={isFetching}
          />
          <ProjectDistributionPie
            title="Faktisk tid"
            items={actualItems}
            total={totals.actual}
            isLoading={isFetching}
          />
        </div>
      )}
    </section>
  );
};

const ProjectDistributionPie = ({
  title,
  items,
  total,
  isLoading,
}: {
  title: string;
  items: ReturnType<typeof buildChartItems>;
  total: number;
  isLoading: boolean;
}) => {
  const hasData = total > 0 && items.some((item) => item.value > 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <p className="text-xs text-slate-500">Total: {formatHours(total)} timer</p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          Opdaterer fordeling...
        </div>
      ) : hasData ? (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="mx-auto h-64 w-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={3}
                >
                  {items.map((entry) => (
                    <Cell key={`${title}-${entry.id}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, payload) => {
                    if (!payload?.payload) return value;
                    const current = payload.payload as (typeof items)[number];
                    return [`${formatHours(Number(value))} t (${current.percentLabel})`, current.label];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex-1 space-y-2 text-sm text-slate-600">
            {items.map((item) => (
              <li
                key={`${title}-legend-${item.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.label}
                </span>
                <span className="font-semibold text-slate-700">
                  {formatHours(item.value)} t • {item.percentLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          Ingen projekter med registreret tid i perioden.
        </div>
      )}
    </div>
  );
};

const OverAllocatedList = ({ overAllocatedSet }: { overAllocatedSet: Set<string> }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5" data-testid="overallocated-list">
    <h3 className="text-sm font-semibold text-slate-700">Over-allokerede uger</h3>
    {overAllocatedSet.size === 0 ? (
      <p className="mt-2 text-sm text-slate-500">Ingen uger overstiger kapaciteten i den valgte periode.</p>
    ) : (
      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {Array.from(overAllocatedSet)
          .sort((a, b) => a.localeCompare(b))
          .map((week) => (
            <li
              key={week}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-600"
            >
              {formatWeekLabel(week)}
            </li>
          ))}
      </ul>
    )}
  </div>
);

const SummaryDiffs = ({ summary, baselineTotal }: { summary: ResourceAnalyticsSummary; baselineTotal: number }) => {
  const plannedVsCapacity = summary.totalPlanned - summary.totalCapacity;
  const actualVsCapacity = summary.totalActual - summary.totalCapacity;
  const actualVsPlanned = summary.totalActual - summary.totalPlanned;
  const plannedVsBaseline = summary.totalPlanned - baselineTotal;
  const actualVsBaseline = summary.totalActual - baselineTotal;

  const items: Array<{ label: string; value: number }> = [
    { label: 'Planlagt vs. kapacitet', value: plannedVsCapacity },
    { label: 'Faktisk vs. kapacitet', value: actualVsCapacity },
    { label: 'Planlagt vs. baseline', value: plannedVsBaseline },
    { label: 'Faktisk vs. baseline', value: actualVsBaseline },
    { label: 'Faktisk vs. planlagt', value: actualVsPlanned },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
      <div className="font-semibold text-slate-700">Afvigelser</div>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3">
            <span>{item.label}</span>
            <DiffBadge value={item.value} />
          </li>
        ))}
      </ul>
    </div>
  );
};

const SummaryComparison = ({
  summary,
  baselineTotal,
}: {
  summary: ResourceAnalyticsSummary;
  baselineTotal: number;
}) => {
  const maxValue = Math.max(summary.totalCapacity, summary.totalPlanned, summary.totalActual, baselineTotal, 1);
  const rows: Array<{ label: string; value: number; barClass: string }> = [
    { label: 'Kapacitet', value: summary.totalCapacity, barClass: 'bg-sky-400' },
    { label: 'Planlagt', value: summary.totalPlanned, barClass: 'bg-amber-400' },
    { label: 'Faktisk', value: summary.totalActual, barClass: 'bg-emerald-500' },
    { label: 'Baseline', value: baselineTotal, barClass: 'bg-indigo-400' },
  ];

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      {rows.map((row) => {
        const rawWidth = (row.value / maxValue) * 100;
        const width = row.value === 0 ? 0 : Math.min(100, Math.max(4, rawWidth));
        return (
          <div key={row.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{row.label}</span>
              <span>{formatHours(row.value)} timer</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${row.barClass}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-slate-500">
        Viser summen for den valgte periode. Bredden af soejlerne afspejler forholdet mellem totalerne.
      </p>
    </div>
  );
};

const DiffBadge = ({ value }: { value: number }) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const baseClasses = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold';
  const toneClass = isPositive
    ? 'border-rose-200 bg-rose-50 text-rose-600'
    : isNegative
      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
      : 'border-slate-200 bg-slate-100 text-slate-600';
  return <span className={`${baseClasses} ${toneClass}`}>{formatDiffHours(value)}</span>;
};

const formatDiffHours = (value: number) => {
  if (!Number.isFinite(value) || value === 0) {
    return '0 timer';
  }
  const prefix = value > 0 ? '+' : '-';
  return `${prefix}${formatHours(Math.abs(value))} timer`;
};

const EmptyState = () => (
  <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center text-slate-500">
    <div className="max-w-md space-y-2">
      <h2 className="text-lg font-semibold text-slate-700">Ingen afdelinger med registreret data</h2>
      <p className="text-sm">
        Tilføj afdelingsoplysninger til medarbejdere, og registrer tid for at aktivere ressourcerapporten.
      </p>
    </div>
  </div>
);

const LoadingState = () => (
  <div className="grid place-items-center rounded-2xl border border-slate-100 bg-slate-50/80 p-10 text-center">
    <div className="flex flex-col items-center gap-3 text-slate-500">
      <svg className="h-10 w-10 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p className="text-sm font-medium">Henter ressourcedata...</p>
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
    <div className="font-semibold">Kunne ikke hente ressourcedata</div>
    <p className="text-sm text-rose-600">{message}</p>
    <button
      onClick={onRetry}
      className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-400"
    >
      Prøv igen
    </button>
  </div>
);

const AnalyticsContent = ({
  chartData,
  baselineHoursWeek,
  baselineTotalHours,
  cumulativeSeries,
  overAllocatedSet,
  isFetching,
  selectedDepartmentLabel,
  range,
  viewMode,
  summary,
  showOverAllocated,
  onToggleOverAllocated,
}: {
  chartData: Array<{ week: string; capacity: number; planned: number; actual: number }>;
  baselineHoursWeek: number;
  baselineTotalHours: number;
  cumulativeSeries: ResourceAnalyticsCumulativePoint[];
  overAllocatedSet: Set<string>;
  isFetching: boolean;
  selectedDepartmentLabel: string;
  range: { fromWeek: string; toWeek: string };
  viewMode: ViewMode;
  summary: ResourceAnalyticsSummary | null;
  showOverAllocated: boolean;
  onToggleOverAllocated: () => void;
}) => {
  const isSummary = viewMode === 'summary';
  const isCumulative = viewMode === 'cumulative';
  const hasChartData = chartData.length > 0;
  const hasCumulativeData = cumulativeSeries.length > 0;
  const hasOverAllocated = overAllocatedSet.size > 0;
  const overAllocatedButtonLabel = showOverAllocated ? 'Skjul over-allokerede uger' : 'Vis over-allokerede uger';

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-800">
            {`${selectedDepartmentLabel} - ${formatWeekLabel(range.fromWeek)} -> ${formatWeekLabel(range.toWeek)}`}
          </h2>
          {isFetching && (
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
              Opdaterer
            </span>
          )}
        </div>
        {hasOverAllocated && (
          <button
            type="button"
            onClick={onToggleOverAllocated}
            aria-pressed={showOverAllocated}
            className={`ml-auto rounded-full border px-4 py-2 text-xs font-medium transition ${
              showOverAllocated
                ? 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                : 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
            }`}
          >
            {overAllocatedButtonLabel}
          </button>
        )}
      </header>

      {isSummary ? (
        summary ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-full rounded-2xl border border-slate-100 bg-white p-5">
              <SummaryComparison summary={summary} baselineTotal={baselineTotalHours} />
            </div>
            <div className="space-y-4">
              <SummaryDiffs summary={summary} baselineTotal={baselineTotalHours} />
              {showOverAllocated && hasOverAllocated ? <OverAllocatedList overAllocatedSet={overAllocatedSet} /> : null}
            </div>
          </div>
        ) : (
          <div className="grid h-64 place-items-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-500">
            Ingen data til opsummering i den valgte periode.
          </div>
        )
      ) : isCumulative ? (
        hasCumulativeData ? (
          <>
            <div className="h-96 w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeSeries}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tickFormatter={formatWeekLabel} stroke="#475569" />
                  <YAxis stroke="#475569" tickFormatter={formatHours} />
                  <Tooltip
                    formatter={(value: number) => `${formatHours(value)} timer (kumulativt)`}
                    labelFormatter={formatWeekLabel}
                    contentStyle={{ borderRadius: '0.75rem', borderColor: '#cbd5f5' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="capacity" name="Kumulativ kapacitet" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="planned" name="Kumulativ planlagt" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="actual" name="Kumulativ faktisk" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {summary ? <SummaryDiffs summary={summary} baselineTotal={baselineTotalHours} /> : null}
            {showOverAllocated && hasOverAllocated ? <OverAllocatedList overAllocatedSet={overAllocatedSet} /> : null}
          </>
        ) : (
          <div className="grid h-64 place-items-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-500">
            Ingen data til den kumulative visning.
          </div>
        )
      ) : (
        <>
          <div className="h-96 w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="week" tickFormatter={formatWeekLabel} stroke="#475569" />
                <YAxis stroke="#475569" tickFormatter={formatHours} />
                <Tooltip
                  formatter={(value: number) => `${formatHours(value)} timer`}
                  labelFormatter={formatWeekLabel}
                  contentStyle={{ borderRadius: '0.75rem', borderColor: '#cbd5f5' }}
                />
                <Legend />
                {hasChartData && (
                  <ReferenceArea
                    x1={chartData[0].week}
                    x2={chartData[chartData.length - 1].week}
                    fill="#eff6ff"
                    fillOpacity={0.3}
                    strokeOpacity={0}
                  />
                )}
                {baselineHoursWeek > 0 && (
                  <ReferenceLine
                    y={baselineHoursWeek}
                    stroke="#6366f1"
                    strokeDasharray="6 6"
                    ifOverflow="extendDomain"
                    label={{
                      position: 'right',
                      value: `Baseline ${formatHours(baselineHoursWeek)} t/uge`,
                      fill: '#4338ca',
                      fontSize: 12,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="capacity"
                  name="Kapacitet"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="planned"
                  name="Planlagt"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Faktisk"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={(props) => {
                    if (!props || typeof props.cx !== 'number' || typeof props.cy !== 'number') {
                      return <circle cx={0} cy={0} r={3} fill="#10b981" stroke="#ffffff" strokeWidth={1} />;
                    }
                    const isOverAllocated = overAllocatedSet.has((props.payload as { week: string }).week);
                    const radius = isOverAllocated ? 6 : 3;
                    const fill = isOverAllocated ? '#dc2626' : '#10b981';
                    const strokeWidth = isOverAllocated ? 2 : 1;
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={radius}
                        fill={fill}
                        stroke="#ffffff"
                        strokeWidth={strokeWidth}
                      />
                    );
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {showOverAllocated && hasOverAllocated ? <OverAllocatedList overAllocatedSet={overAllocatedSet} /> : null}
        </>
      )}
    </section>
  );
};

export default ResourceAnalyticsPage;





