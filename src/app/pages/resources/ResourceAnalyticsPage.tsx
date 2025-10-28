import { useMemo, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
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
import { RESOURCES_ANALYTICS_ENABLED } from '../../constants';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { useResourceAnalytics } from '../../../hooks/useResourceAnalytics';
import type { ResourceAnalyticsQuery } from '../../../types';

const DEFAULT_WEEK_RANGE = 12;
const RANGE_OPTIONS = [6, 12, 24] as const;

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
  const latestPoint = data?.series.at(-1);
  const chartData = data?.series ?? [];

  return (
    <div className="space-y-8">
      <AppHeader title="Ressource Analytics" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
        <button
          onClick={() => refetch()}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          disabled={isFetching || isPending}
        >
          Opdater
        </button>
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

          {data && (
            <div className="ml-auto grid grid-cols-2 gap-4">
              <SummaryCard label="Kapacitet" value={formatHours(latestPoint?.capacity ?? 0)} suffix="timer/uge" tone="capacity" />
              <SummaryCard label="Planlagte timer" value={formatHours(latestPoint?.planned ?? 0)} suffix="timer" tone="planned" />
              <SummaryCard label="Faktiske timer" value={formatHours(latestPoint?.actual ?? 0)} suffix="timer" tone="actual" />
              <SummaryCard
                label="Over-allokerede uger"
                value={overAllocatedSet.size.toString()}
                suffix="uger"
                tone={overAllocatedSet.size > 0 ? 'alert' : 'capacity'}
              />
            </div>
          )}
        </section>

        {!departments.length ? (
          <EmptyState />
        ) : isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={error?.message ?? 'Kunne ikke hente data.'} onRetry={() => refetch()} />
        ) : (
          <AnalyticsContent
            chartData={chartData}
            overAllocatedSet={overAllocatedSet}
            isFetching={isFetching}
            selectedDepartment={selectedDepartment}
            range={range}
          />
        )}
      </main>
    </div>
  );
};

type SummaryTone = 'capacity' | 'planned' | 'actual' | 'alert';

const toneClasses: Record<SummaryTone, { bg: string; text: string; badge: string }> = {
  capacity: { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-600' },
  planned: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-600' },
  actual: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-600' },
  alert: { bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-600' },
};

const SummaryCard = ({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone: SummaryTone;
}) => {
  const palette = toneClasses[tone];
  return (
    <article className={`rounded-2xl ${palette.bg} px-4 py-3`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 flex items-baseline gap-1 text-2xl font-semibold ${palette.text}`}>
        {value}
        {suffix && <span className={`text-xs font-semibold ${palette.badge} px-2 py-0.5 rounded-full`}>{suffix}</span>}
      </div>
    </article>
  );
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
  overAllocatedSet,
  isFetching,
  selectedDepartment,
  range,
}: {
  chartData: Array<{ week: string; capacity: number; planned: number; actual: number }>;
  overAllocatedSet: Set<string>;
  isFetching: boolean;
  selectedDepartment: string;
  range: { fromWeek: string; toWeek: string };
}) => (
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
          {chartData.length > 0 && (
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
  </section>
);

export default ResourceAnalyticsPage;



