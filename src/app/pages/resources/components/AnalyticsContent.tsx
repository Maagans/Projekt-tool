import { memo } from 'react';
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
  ReferenceLine,
} from 'recharts';
import type { ResourceAnalyticsCumulativePoint, ResourceAnalyticsSummary } from '../../../../hooks/useResourceAnalytics';
import type { ViewMode, AnalyticsRange } from '../types';
import { formatHours, formatWeekLabel } from '../../../../utils/format';
import { SummaryComparison } from './SummaryComparison';
import { SummaryDiffs } from './SummaryDiffs';
import { OverAllocatedList } from './OverAllocatedList';

type AnalyticsContentProps = {
  chartData: Array<{ week: string; capacity: number; planned: number; actual: number }>;
  baselineHoursWeek: number;
  baselineTotalHours: number;
  cumulativeSeries: ResourceAnalyticsCumulativePoint[];
  overAllocatedSet: Set<string>;
  isFetching: boolean;
  selectedDepartmentLabel: string;
  range: AnalyticsRange;
  viewMode: ViewMode;
  summary: ResourceAnalyticsSummary | null;
  showOverAllocated: boolean;
  onToggleOverAllocated: () => void;
};

export const AnalyticsContent = memo(function AnalyticsContent({
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
}: AnalyticsContentProps) {
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
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              Opdaterer
            </span>
          )}
        </div>
        {hasOverAllocated && (
          <button
            type="button"
            onClick={onToggleOverAllocated}
            aria-pressed={showOverAllocated}
            className={`ml-auto rounded-full border px-4 py-2 text-xs font-medium transition ${showOverAllocated
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
            <div className="text-sm font-semibold text-slate-700">Kumulativ kapacitet</div>
            <div className="h-96 w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeSeries}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tickFormatter={formatWeekLabel} stroke="#475569" />
                  <YAxis stroke="#475569" tickFormatter={(value) => formatHours(Number(value))} />
                  <Tooltip
                    formatter={(value: number) => `${formatHours(value)} timer (kumulativt)`}
                    labelFormatter={formatWeekLabel}
                    contentStyle={{ borderRadius: '0.75rem', borderColor: '#cbd5f5' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="capacity" name="Kumulativ kapacitet" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="planned" name="Kumulativ planlagt" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="actual" name="Kumulativ faktisk" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
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
                <YAxis stroke="#475569" tickFormatter={(value) => formatHours(Number(value))} />
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
                <Line type="monotone" dataKey="capacity" name="Kapacitet" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="planned" name="Planlagt" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
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
                    const week = (props.payload as { week?: string }).week ?? '';
                    const isOverAllocated = overAllocatedSet.has(week);
                    const radius = isOverAllocated ? 6 : 3;
                    const fill = isOverAllocated ? '#dc2626' : '#10b981';
                    const strokeWidth = isOverAllocated ? 2 : 1;
                    return <circle cx={props.cx} cy={props.cy} r={radius} fill={fill} stroke="#ffffff" strokeWidth={strokeWidth} />;
                  }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {showOverAllocated && hasOverAllocated ? <OverAllocatedList overAllocatedSet={overAllocatedSet} /> : null}
        </>
      )}
    </section>
  );
});
