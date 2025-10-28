import { useMemo, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
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

const DEFAULT_WEEK_RANGE = 12;
const RANGE_OPTIONS = [6, 12, 24] as const;
type ViewMode = 'weekly' | 'summary' | 'cumulative';
const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'weekly', label: 'Ugentlig' },
  { value: 'summary', label: 'Opsummeret' },
  { value: 'cumulative', label: 'Kumulativ' },
];

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

export const ResourceAnalyticsPage = () => {
  const projectManager = useProjectManager();
  const navigate = useNavigate();
  const { logout, currentUser, isSaving, apiError, isAdministrator, employees } = projectManager;

  const departments = useMemo(() => {
    const unique = new Set<string>();
    employees.forEach((employee) => {
      if (employee.department) {
        unique.add(employee.department);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'da'));
  }, [employees]);

  const [rangeWeeks, setRangeWeeks] = useState<number>(DEFAULT_WEEK_RANGE);
  const [range, setRange] = useState(() => deriveDefaultRange(DEFAULT_WEEK_RANGE));
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

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

  if (!RESOURCES_ANALYTICS_ENABLED || !isAdministrator) {
    return <Navigate to="/" replace />;
  }

  const { data, isPending, isFetching, isError, error, refetch } = analyticsQuery;
  const overAllocatedSet = data?.overAllocatedWeeksSet ?? new Set<string>();
  const chartData = data?.series ?? [];
  const latestPoint = data?.latestPoint ?? chartData.at(-1) ?? null;
  const summary = data?.summary ?? null;
  const cumulativeSeries = data?.cumulativeSeries ?? [];

  const summaryCards = (() => {
    if (!data) return [];
    if (viewMode === 'weekly') {
      return [
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
    }
    if (!summary) return [];
    const labelPrefix = viewMode === 'cumulative' ? 'Kumulativ ' : 'Total ';
    const helperSuffix = `Gns. ${formatHours(summary.averageCapacity)} timer/uge - ${summary.weeks} uger`;
    return [
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
    <div className="space-y-8">
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

      <main className="space-y-6 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-blue-500/5 backdrop-blur">
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
                    {department}
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
          <AnalyticsContent
            chartData={chartData}
            cumulativeSeries={cumulativeSeries}
            overAllocatedSet={overAllocatedSet}
            isFetching={isFetching}
            selectedDepartment={selectedDepartment}
            range={range}
            viewMode={viewMode}
            summary={summary}
          />
        )}
      </main>
    </div>
  );
};

const getSummaryTone = (value: number, capacity: number, fallback: ResourceSummaryTone): ResourceSummaryTone => {
  if (!Number.isFinite(value) || !Number.isFinite(capacity)) {
    return fallback;
  }
  return value > capacity ? 'alert' : fallback;
};

const OverAllocatedList = ({ overAllocatedSet }: { overAllocatedSet: Set<string> }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
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

const SummaryDiffs = ({ summary }: { summary: ResourceAnalyticsSummary }) => {
  const plannedVsCapacity = summary.totalPlanned - summary.totalCapacity;
  const actualVsCapacity = summary.totalActual - summary.totalCapacity;
  const actualVsPlanned = summary.totalActual - summary.totalPlanned;

  const items: Array<{ label: string; value: number }> = [
    { label: 'Planlagt vs. kapacitet', value: plannedVsCapacity },
    { label: 'Faktisk vs. kapacitet', value: actualVsCapacity },
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

const SummaryComparison = ({ summary }: { summary: ResourceAnalyticsSummary }) => {
  const maxValue = Math.max(summary.totalCapacity, summary.totalPlanned, summary.totalActual, 1);
  const rows: Array<{ label: string; value: number; barClass: string }> = [
    { label: 'Kapacitet', value: summary.totalCapacity, barClass: 'bg-sky-400' },
    { label: 'Planlagt', value: summary.totalPlanned, barClass: 'bg-amber-400' },
    { label: 'Faktisk', value: summary.totalActual, barClass: 'bg-emerald-500' },
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
        Tilf�j afdelingsoplysninger til medarbejdere, og registrer tid for at aktivere ressourcerapporten.
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
      Pr�v igen
    </button>
  </div>
);

const AnalyticsContent = ({
  chartData,
  cumulativeSeries,
  overAllocatedSet,
  isFetching,
  selectedDepartment,
  range,
  viewMode,
  summary,
}: {
  chartData: Array<{ week: string; capacity: number; planned: number; actual: number }>;
  cumulativeSeries: ResourceAnalyticsCumulativePoint[];
  overAllocatedSet: Set<string>;
  isFetching: boolean;
  selectedDepartment: string;
  range: { fromWeek: string; toWeek: string };
  viewMode: ViewMode;
  summary: ResourceAnalyticsSummary | null;
}) => {
  const isSummary = viewMode === 'summary';
  const isCumulative = viewMode === 'cumulative';
  const hasChartData = chartData.length > 0;
  const hasCumulativeData = cumulativeSeries.length > 0;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <h2 className="text-lg font-semibold text-slate-800">
          {`${selectedDepartment} - ${formatWeekLabel(range.fromWeek)} -> ${formatWeekLabel(range.toWeek)}`}
        </h2>
        {isFetching && (
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
            Opdaterer
          </span>
        )}
      </header>

      {isSummary ? (
        summary ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-full rounded-2xl border border-slate-100 bg-white p-5">
              <SummaryComparison summary={summary} />
            </div>
            <div className="space-y-4">
              <SummaryDiffs summary={summary} />
              <OverAllocatedList overAllocatedSet={overAllocatedSet} />
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
            {summary ? <SummaryDiffs summary={summary} /> : null}
            <OverAllocatedList overAllocatedSet={overAllocatedSet} />
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

          <OverAllocatedList overAllocatedSet={overAllocatedSet} />
        </>
      )}
    </section>
  );
};

export default ResourceAnalyticsPage;



