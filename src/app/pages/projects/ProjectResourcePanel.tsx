import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useResourceAnalytics } from "../../../hooks/useResourceAnalytics";
import { RESOURCES_ANALYTICS_ENABLED } from "../../constants";
import type { ResourceAnalyticsQuery } from "../../../types";
import { useProjectRouteContext } from "./ProjectLayout";

const RANGE_OPTIONS = [6, 12, 24] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toIsoWeek = (input: Date) => {
  const date = startOfUtcDay(input);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = Number(date) - Number(yearStart);
  const week = Math.ceil((diff / MS_PER_DAY + 1) / 7);
  return { year: date.getUTCFullYear(), week };
};

const formatWeekKey = ({ year, week }: { year: number; week: number }) =>
  `${year}-W${String(week).padStart(2, "0")}`;

const subtractWeeks = (date: Date, weeks: number) => {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() - weeks * 7);
  return result;
};

const deriveDefaultRange = (weeks: number) => {
  const today = new Date();
  const toWeek = formatWeekKey(toIsoWeek(today));
  const fromDate = subtractWeeks(today, Math.max(weeks - 1, 0));
  const fromWeek = formatWeekKey(toIsoWeek(fromDate));
  return { fromWeek, toWeek };
};

const formatWeekLabel = (weekKey: string) => {
  const [yearPart, weekPart] = weekKey.split("-W");
  if (!yearPart || !weekPart) {
    return weekKey;
  }
  return `Uge ${Number(weekPart)} (${yearPart})`;
};

const formatHours = (value: number) =>
  new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(value);

export const ProjectResourcePanel = () => {
  const { project, projectManager } = useProjectRouteContext();

  const isAllowed = RESOURCES_ANALYTICS_ENABLED && projectManager.canManage;

  const [rangeWeeks, setRangeWeeks] = useState<number>(12);
  const [range, setRange] = useState(() => deriveDefaultRange(12));

  useEffect(() => {
    if (!isAllowed) return;
    setRange(deriveDefaultRange(rangeWeeks));
  }, [rangeWeeks, isAllowed]);

  const analyticsParams: ResourceAnalyticsQuery = useMemo(
    () => ({
      scope: "project",
      scopeId: project.id,
      fromWeek: range.fromWeek,
      toWeek: range.toWeek,
    }),
    [project.id, range.fromWeek, range.toWeek],
  );

  const analytics = useResourceAnalytics(analyticsParams, {
    enabled: isAllowed,
    staleTime: 2 * 60 * 1000,
  });

  if (!isAllowed) {
    return null;
  }

  const { data, isPending, isFetching, isError, error, refetch } = analytics;
  const chartData = data?.series ?? [];
  const latestPoint = chartData.at(-1);
  const overAllocated = data?.overAllocatedWeeksSet ?? new Set<string>();
  const hasData = Boolean(chartData.length);

  return (
    <section className="w-full rounded-3xl border border-slate-100 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Ressourceoverblik</h3>
          <p className="text-xs text-slate-500">
            Viser kapacitet, planlagte og faktiske timer for dette projekt.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Periode:</span>
          <div className="flex items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-full border px-3 py-1 font-semibold transition ${
                  rangeWeeks === option
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}
                onClick={() => setRangeWeeks(option)}
              >
                {option} uger
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isFetching && (
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              Opdaterer
            </span>
          )}
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
            onClick={() => refetch()}
            disabled={isFetching || isPending}
          >
            Opdater
          </button>
        </div>
      </header>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SummaryCard
            label="Kapacitet"
            value={formatHours(latestPoint?.capacity ?? 0)}
            suffix="timer"
            tone="capacity"
          />
          <SummaryCard
            label="Planlagt"
            value={formatHours(latestPoint?.planned ?? 0)}
            suffix="timer"
            tone={latestPoint && latestPoint.planned > (latestPoint.capacity ?? 0) ? "alert" : "planned"}
          />
          <SummaryCard
            label="Faktisk"
            value={formatHours(latestPoint?.actual ?? 0)}
            suffix="timer"
            tone={latestPoint && latestPoint.actual > (latestPoint.capacity ?? 0) ? "alert" : "actual"}
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-700">Over-allokerede uger</div>
            {!hasData ? (
              <p className="mt-1 text-xs text-slate-500">Ingen data i den valgte periode.</p>
            ) : overAllocated.size === 0 ? (
              <p className="mt-1 text-xs text-slate-500">Ingen uger overstiger kapaciteten.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {Array.from(overAllocated)
                  .sort((a, b) => a.localeCompare(b))
                  .map((week) => (
                    <li
                      key={week}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                    >
                      {formatWeekLabel(week)}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        <div className="h-60 rounded-2xl border border-slate-100 bg-white p-3">
          {isPending ? (
            <PanelLoading />
          ) : isError ? (
            <PanelError message={error?.message ?? "Kunne ikke hente data."} onRetry={() => refetch()} />
          ) : !hasData ? (
            <div className="grid h-full place-items-center text-sm text-slate-500">
              Ingen ressourcedata tilgaengelig endnu.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tickFormatter={formatWeekLabel} stroke="#475569" />
                <YAxis stroke="#475569" tickFormatter={formatHours} />
                <Tooltip
                  formatter={(value: number) => `${formatHours(value)} timer`}
                  labelFormatter={formatWeekLabel}
                  contentStyle={{ borderRadius: "0.75rem", borderColor: "#cbd5f5" }}
                />
                <Legend />
                <ReferenceArea
                  x1={chartData[0]?.week}
                  x2={chartData[chartData.length - 1]?.week}
                  fill="#eff6ff"
                  fillOpacity={0.25}
                  strokeOpacity={0}
                />
                <Line type="monotone" dataKey="capacity" name="Kapacitet" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="planned" name="Planlagt" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Faktisk"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={(props) => {
                    if (!props || typeof props.cx !== "number" || typeof props.cy !== "number") {
                      return null;
                    }
                    const weekKey = (props.payload as { week: string }).week;
                    const isOverAllocated = overAllocated.has(weekKey);
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={isOverAllocated ? 6 : 3}
                        fill={isOverAllocated ? "#dc2626" : "#10b981"}
                        stroke="#ffffff"
                        strokeWidth={isOverAllocated ? 2 : 1}
                      />
                    );
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
};

type SummaryTone = "capacity" | "planned" | "actual" | "alert";

const toneStyles: Record<SummaryTone, { container: string; badge: string; value: string }> = {
  capacity: {
    container: "border-sky-100 bg-sky-50",
    badge: "bg-sky-100 text-sky-600",
    value: "text-sky-700",
  },
  planned: {
    container: "border-amber-100 bg-amber-50",
    badge: "bg-amber-100 text-amber-600",
    value: "text-amber-700",
  },
  actual: {
    container: "border-emerald-100 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-700",
  },
  alert: {
    container: "border-rose-100 bg-rose-50",
    badge: "bg-rose-100 text-rose-600",
    value: "text-rose-700",
  },
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
  const palette = toneStyles[tone];
  return (
    <div className={`rounded-2xl border ${palette.container} px-4 py-3`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 flex items-baseline gap-2 text-2xl font-semibold ${palette.value}`}>
        {value}
        {suffix && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${palette.badge}`}>{suffix}</span>}
      </div>
    </div>
  );
};

const PanelLoading = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
    <svg className="h-8 w-8 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <p className="text-xs font-medium">Henter projektets ressourcedataâ€¦</p>
  </div>
);

const PanelError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
    <div className="text-sm font-semibold text-rose-700">Kunne ikke hente data</div>
    <p className="text-xs text-rose-600">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-400"
    >
      PrÃ¸v igen
    </button>
  </div>
);

export default ProjectResourcePanel;
