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

export const StackedProjectsCard = ({ chart, baselineHoursWeek, baselineTotalHours }: StackedProjectsCardProps) => {
  const areaMeta = new Map<string, StackAreaConfig>();
  [...chart.plannedAreas, ...chart.actualAreas].forEach((area) => {
    areaMeta.set(area.dataKey, area);
  });

  return (
    <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" data-testid="stacked-projects-card">
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
            <YAxis stroke="#475569" tickFormatter={(value) => formatHours(Number(value))} />
            {baselineHoursWeek > 0 &&
              chart.overBaselineRanges.map((range) => (
                <ReferenceArea
                  key={`${range.start}-${range.end}`}
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
            {[...chart.plannedAreas, ...chart.actualAreas].map((area) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                stackId={area.variant === 'planned' ? 'planned' : 'actual'}
                stroke={area.color}
                fill={applyAlpha(area.color, area.variant === 'planned' ? 0.35 : 0.65)}
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
