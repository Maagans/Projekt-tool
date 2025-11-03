import type { ReactNode } from 'react';

export type ResourceSummaryTone = 'capacity' | 'planned' | 'actual' | 'baseline' | 'alert';

const toneStyles: Record<ResourceSummaryTone, { container: string; badge: string; value: string }> = {
  capacity: {
    container: 'border-sky-100 bg-sky-50',
    badge: 'bg-sky-100 text-sky-600',
    value: 'text-sky-700',
  },
  planned: {
    container: 'border-amber-100 bg-amber-50',
    badge: 'bg-amber-100 text-amber-600',
    value: 'text-amber-700',
  },
  actual: {
    container: 'border-emerald-100 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-700',
  },
  baseline: {
    container: 'border-indigo-100 bg-indigo-50',
    badge: 'bg-indigo-100 text-indigo-600',
    value: 'text-indigo-700',
  },
  alert: {
    container: 'border-rose-100 bg-rose-50',
    badge: 'bg-rose-100 text-rose-600',
    value: 'text-rose-700',
  },
};

type ResourceSummaryCardProps = {
  label: string;
  value: string;
  suffix?: string | undefined;
  tone: ResourceSummaryTone;
  helper?: string | undefined;
  icon?: ReactNode | undefined;
};

export const ResourceSummaryCard = ({
  label,
  value,
  suffix,
  tone,
  helper,
  icon,
}: ResourceSummaryCardProps) => {
  const palette = toneStyles[tone];
  return (
    <article className={`rounded-2xl border px-4 py-3 ${palette.container}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className={`mt-1 flex items-baseline gap-2 text-2xl font-semibold ${palette.value}`}>
            {value}
            {suffix && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${palette.badge}`}>{suffix}</span>}
          </div>
          {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
        </div>
        {icon}
      </div>
    </article>
  );
};
