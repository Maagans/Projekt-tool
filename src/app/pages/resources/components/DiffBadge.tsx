import { formatDiffHours } from '../../../../utils/format';

type DiffBadgeProps = {
  value: number;
};

export const DiffBadge = ({ value }: DiffBadgeProps) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const baseClasses = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold';
  const toneClass = isPositive
    ? 'border-rose-200 bg-rose-50 text-rose-600'
    : isNegative
      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
      : 'border-slate-200 bg-slate-100 text-slate-600';

  return <span className={`${baseClasses} ${toneClass}`}>{formatDiffHours(value)}</span>;
};
