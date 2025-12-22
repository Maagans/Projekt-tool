
import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
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
import { useResourceAnalytics, type ResourceAnalyticsSummary } from "../../../hooks/useResourceAnalytics";
import { RESOURCES_ANALYTICS_ENABLED } from "../../constants";
import type { ResourceAnalyticsQuery } from "../../../types";
import { useProjectRouteContext } from "./ProjectLayout";
import { ResourceSummaryCard, type ResourceSummaryTone } from "../../../components/ResourceSummaryCard";

const RANGE_OPTIONS = [6, 12, 24] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
type ViewMode = "weekly" | "summary" | "cumulative";
const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: "weekly", label: "Ugentlig" },
  { value: "summary", label: "Opsummeret" },
  { value: "cumulative", label: "Kumulativ" },
];

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
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");

  // Derive range directly from rangeWeeks - stable through renders unless rangeWeeks changes
  const range = useMemo(() => deriveDefaultRange(rangeWeeks), [rangeWeeks]);

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
    placeholderData: keepPreviousData,
  });

  if (!isAllowed) {
    return null;
  }

  const { data, isPending, isFetching, isError, error, refetch } = analytics;
  const chartData = data?.series ?? [];
  const hasData = Boolean(chartData.length);
  const latestPoint = data?.latestPoint ?? chartData.at(-1) ?? null;
  const summary = data?.summary ?? null;
  const cumulativeSeries = data?.cumulativeSeries ?? [];

  const summaryCardConfigs = (() => {
    if (!data) return null;
    if (viewMode === "weekly") {
      return [
        {
          label: "Planlagt (seneste uge)",
          value: formatHours(latestPoint?.planned ?? 0),
          suffix: "timer",
          tone: getSummaryTone(latestPoint?.planned ?? 0, latestPoint?.capacity ?? 0, "planned"),
          helper: latestPoint ? formatWeekLabel(latestPoint.week) : undefined,
        },
        {
          label: "Faktisk (seneste uge)",
          value: formatHours(latestPoint?.actual ?? 0),
          suffix: "timer",
          tone: getSummaryTone(latestPoint?.actual ?? 0, latestPoint?.capacity ?? 0, "actual"),
          helper: latestPoint ? formatWeekLabel(latestPoint.week) : undefined,
        },
      ];
    }
    if (!summary) return null;
    const labelPrefix = viewMode === "cumulative" ? "Kumulativ " : "Total ";
    return [
      {
        label: `${labelPrefix} planlagt`,
        value: formatHours(summary.totalPlanned),
        suffix: "timer",
        tone: "planned" as ResourceSummaryTone,
        helper: `Gns.${formatHours(summary.averagePlanned)} timer / uge`,
      },
      {
        label: `${labelPrefix} faktisk`,
        value: formatHours(summary.totalActual),
        suffix: "timer",
        tone: "actual" as ResourceSummaryTone,
        helper: `Gns.${formatHours(summary.averageActual)} timer / uge`,
      },
    ];
  })();

  return (
    <section className="w-full rounded-3xl border border-slate-100 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Ressourceoverblik</h3>
          <p className="text-xs text-slate-500">
            Viser planlagte og faktiske timer for dette projekt.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Periode:</span>
          <div className="flex items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-full border px-3 py-1 font-semibold transition ${rangeWeeks === option
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
        <div className="flex flex-col gap-1 text-xs text-slate-500">
          <span>Visning:</span>
          <div className="flex items-center gap-2">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-full border px-3 py-1 font-semibold transition ${viewMode === option.value
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                onClick={() => setViewMode(option.value)}
              >
                {option.label}
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
          {summaryCardConfigs && summaryCardConfigs.length > 0 ? (
            summaryCardConfigs.map((card) => <ResourceSummaryCard key={card.label} {...card} />)
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Ingen data i den valgte periode.
            </div>
          )}
          {(viewMode === "summary" || viewMode === "cumulative") && summary ? <SummaryDiffs summary={summary} /> : null}
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
          ) : viewMode === "weekly" ? (
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
                <Line type="monotone" dataKey="planned" name="Planlagt" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Faktisk"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : viewMode === "cumulative" ? (
            cumulativeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tickFormatter={formatWeekLabel} stroke="#475569" />
                  <YAxis stroke="#475569" tickFormatter={formatHours} />
                  <Tooltip
                    formatter={(value: number) => `${formatHours(value)} timer(kumulativt)`}
                    labelFormatter={formatWeekLabel}
                    contentStyle={{ borderRadius: "0.75rem", borderColor: "#cbd5f5" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="planned" name="Kumulativ planlagt" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="actual" name="Kumulativ faktisk" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-500">
                Ingen ressourcedata til den kumulative visning.
              </div>
            )
          ) : summary ? (
            <SummaryComparison summary={summary} />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">
              Ingen ressourcedata tilgaengelig endnu.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const getSummaryTone = (value: number, capacity: number, fallback: ResourceSummaryTone): ResourceSummaryTone => {
  if (!Number.isFinite(value) || !Number.isFinite(capacity)) {
    return fallback;
  }
  return value > capacity ? "alert" : fallback;
};

const SummaryDiffs = ({ summary }: { summary: ResourceAnalyticsSummary }) => {
  const actualVsPlanned = summary.totalActual - summary.totalPlanned;

  const items: Array<{ label: string; value: number }> = [{ label: "Faktisk vs. planlagt", value: actualVsPlanned }];

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
  const maxValue = Math.max(summary.totalPlanned, summary.totalActual, 1);
  const rows: Array<{ label: string; value: number; barClass: string }> = [
    { label: "Planlagt", value: summary.totalPlanned, barClass: "bg-amber-400" },
    { label: "Faktisk", value: summary.totalActual, barClass: "bg-emerald-500" },
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
              <div className={`h - full rounded - full ${row.barClass} `} style={{ width: `${width}% ` }} />
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
  const baseClasses = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold";
  const toneClass = isPositive
    ? "border-rose-200 bg-rose-50 text-rose-600"
    : isNegative
      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
      : "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`${baseClasses} ${toneClass} `}>{formatDiffHours(value)}</span>;
};

const formatDiffHours = (value: number) => {
  if (!Number.isFinite(value) || value === 0) {
    return "0 timer";
  }
  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatHours(Math.abs(value))} timer`;
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
    <p className="text-xs font-medium">Henter projektets ressourcedata...</p>
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
      Prøv igen
    </button>
  </div>
);

export default ProjectResourcePanel;
