import type { ResourceAnalyticsSummary } from '../../../../hooks/useResourceAnalytics';
import { formatHours } from '../../../../utils/format';

type SummaryComparisonProps = {
  summary: ResourceAnalyticsSummary;
  baselineTotal: number;
};

export const SummaryComparison = ({ summary, baselineTotal }: SummaryComparisonProps) => {
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
        Viser summen for den valgte periode. Bredden af søjlerne afspejler forholdet mellem totalerne.
      </p>
    </div>
  );
};
