import type { ResourceAnalyticsSummary } from '../../../../hooks/useResourceAnalytics';
import { DiffBadge } from './DiffBadge';

type SummaryDiffsProps = {
  summary: ResourceAnalyticsSummary;
  baselineTotal: number;
};

export const SummaryDiffs = ({ summary, baselineTotal }: SummaryDiffsProps) => {
  const plannedVsCapacity = summary.totalPlanned - summary.totalCapacity;
  const actualVsCapacity = summary.totalActual - summary.totalCapacity;
  const actualVsCapacityPlanned = summary.totalActual - summary.totalPlanned;
  const plannedVsBaseline = summary.totalPlanned - baselineTotal;
  const actualVsBaseline = summary.totalActual - baselineTotal;

  const items: Array<{ label: string; value: number }> = [
    { label: 'Planlagt vs. kapacitet', value: plannedVsCapacity },
    { label: 'Faktisk vs. kapacitet', value: actualVsCapacity },
    { label: 'Planlagt vs. baseline', value: plannedVsBaseline },
    { label: 'Faktisk vs. baseline', value: actualVsBaseline },
    { label: 'Faktisk vs. planlagt', value: actualVsCapacityPlanned },
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
