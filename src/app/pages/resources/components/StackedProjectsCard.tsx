import { useState, useMemo, memo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip } from 'recharts';
import { applyAlpha, type ProjectStackChartConfig, type StackAreaConfig } from '../resourceAnalyticsStacking';
import { formatWeekLabel, formatHours } from '../../../../utils/format';
import { StackedLegend } from './StackedLegend';
import { StackedTooltip } from './StackedTooltip';
import { OverBaselineBadges } from './OverBaselineBadges';

type StackedProjectsCardProps = {
  chart: ProjectStackChartConfig;
  baselineHoursWeek: number;
  baselineTotalHours: number;
};

export const StackedProjectsCard = memo(function StackedProjectsCard({ chart, baselineHoursWeek, baselineTotalHours }: StackedProjectsCardProps) {
  const [view, setView] = useState<'planned' | 'actual'>('planned');

  const areaMeta = useMemo(() => {
    const meta = new Map<string, StackAreaConfig>();
    [...chart.plannedAreas, ...chart.actualAreas].forEach((area) => {
      meta.set(area.dataKey, area);
    });
    return meta;
  }, [chart.plannedAreas, chart.actualAreas]);

  const computeOverBaselineRanges = (variant: 'planned' | 'actual') => {
    if (baselineHoursWeek <= 0) return [];
    const ranges: Array<{ start: string; end: string }> = [];
    let start: string | null = null;
    const getValue = (point: ProjectStackChartConfig['data'][number]) =>
      variant === 'planned' ? point.plannedTotal : point.actualTotal;

    chart.data.forEach((point, index) => {
      const over = getValue(point) > baselineHoursWeek;
      if (over && !start) {
        start = point.week;
      }
      if (!over && start) {
        ranges.push({ start, end: chart.data[index - 1]?.week ?? point.week });
        start = null;
      }
    });

    if (start) {
      ranges.push({ start, end: chart.data[chart.data.length - 1]?.week ?? start });
    }
    return ranges;
  };

  const computeOverBaselineWeeks = (variant: 'planned' | 'actual') =>
    baselineHoursWeek <= 0
      ? []
      : chart.data.filter((point) =>
        variant === 'planned' ? point.plannedTotal > baselineHoursWeek : point.actualTotal > baselineHoursWeek,
      ).map((point) => point.week);

  const renderChart = (variant: 'planned' | 'actual') => {
    const areas = variant === 'planned' ? chart.plannedAreas : chart.actualAreas;
    const getValue = (point: ProjectStackChartConfig['data'][number]) =>
      variant === 'planned' ? point.plannedTotal : point.actualTotal;
    const maxSeriesValue = Math.max(0, ...chart.data.map(getValue));
    const overRanges = computeOverBaselineRanges(variant);
    const yMax = Math.max(baselineHoursWeek || 0, maxSeriesValue);

    return (
      <div
        key={variant}
        className={`absolute inset-0 transition-opacity duration-300 ${view === variant ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        aria-hidden={view !== variant}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart.data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
            <XAxis dataKey="week" tickFormatter={formatWeekLabel} stroke="#475569" minTickGap={12} />
            <YAxis
              stroke="#475569"
              tickFormatter={(value) => formatHours(Number(value))}
              domain={[0, yMax > 0 ? yMax : 'auto']}
            />
            {baselineHoursWeek > 0 &&
              overRanges.map((range) => (
                <ReferenceArea
                  key={`${range.start}-${range.end}-${variant}`}
                  x1={range.start}
                  x2={range.end}
                  y2={baselineHoursWeek}
                  fill="#fee2e2"
                  stroke="#fecaca"
                  fillOpacity={0.4}
                />
              ))}
            {baselineHoursWeek > 0 && (
              <ReferenceArea
                x1={chart.data[0]?.week}
                x2={chart.data[chart.data.length - 1]?.week}
                y1={baselineHoursWeek}
                y2={baselineHoursWeek}
                stroke="#f87171"
                strokeDasharray="4 4"
              />
            )}
            <Tooltip content={<StackedTooltip meta={areaMeta} baseline={baselineHoursWeek} />} />
            {areas.map((area) => (
              <Area
                key={`${variant}-${area.dataKey}`}
                type="monotone"
                dataKey={area.dataKey}
                stackId="stack"
                stroke={area.color}
                fill={applyAlpha(area.color, variant === 'planned' ? 0.35 : 0.65)}
                fillOpacity={1}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const overBaselineWeeks = computeOverBaselineWeeks(view);

  return (
    <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" data-testid="stacked-projects-card">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Stacked belastning pr. projekt</h3>
          <p className="mt-1 text-sm text-slate-500">
            Viser planlagt og faktisk tid pr. projekt. Brug togglen til at skifte mellem planlagt og faktisk visning.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-slate-500">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setView('planned')}
              className={`rounded-full px-3 py-1 transition ${view === 'planned' ? 'bg-white text-slate-800 shadow-sm' : ''}`}
            >
              Planlagt
            </button>
            <button
              type="button"
              onClick={() => setView('actual')}
              className={`rounded-full px-3 py-1 transition ${view === 'actual' ? 'bg-white text-slate-800 shadow-sm' : ''}`}
            >
              Faktisk
            </button>
          </div>
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

      <div className="relative h-96 w-full rounded-2xl border border-slate-100 bg-slate-50/40 p-3 overflow-hidden">
        {(['planned', 'actual'] as const).map((variant) => renderChart(variant))}
      </div>

      <StackedLegend entries={chart.legendEntries} />
      <OverBaselineBadges weeks={overBaselineWeeks} baselineHoursWeek={baselineHoursWeek} />
    </section>
  );
});
