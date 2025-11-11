import type { StackLegendEntry } from '../resourceAnalyticsStacking';
import { formatHours } from '../../../../utils/format';

type StackedLegendProps = {
  entries: StackLegendEntry[];
};

export const StackedLegend = ({ entries }: StackedLegendProps) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
    <h3 className="text-sm font-semibold text-slate-700">Projektoversigt</h3>
    {entries.length === 0 ? (
      <p className="mt-2 text-sm text-slate-500">Ingen projekter har registreret tid i perioden.</p>
    ) : (
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {entries.map((entry) => (
          <li key={`legend-${entry.projectId}`} className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.projectName}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Total: {formatHours(entry.planned + entry.actual)} t
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div className="flex flex-col gap-0.5">
                <dt>Planlagt</dt>
                <dd className="font-semibold text-slate-700">{formatHours(entry.planned)} t</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt>Faktisk</dt>
                <dd className="font-semibold text-slate-700">{formatHours(entry.actual)} t</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    )}
  </div>
);
