import type { StackAreaConfig, ProjectStackChartPoint } from '../resourceAnalyticsStacking';
import { formatWeekLabel, formatHours } from '../../../../utils/format';

type ChartTooltipEntry = {
  value?: number;
  dataKey?: string | number;
  payload?: ProjectStackChartPoint;
};

export type StackedTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
  meta: Map<string, StackAreaConfig>;
  baseline: number;
};

export const StackedTooltip = ({ active, payload, label, meta, baseline }: StackedTooltipProps) => {
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

  const renderRows = (entries: Array<{ name: string; value: number; color: string }>) => (
    <ul className="mt-1 space-y-1">
      {entries.map((row) => (
        <li key={`${row.name}-${row.color}`} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
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
