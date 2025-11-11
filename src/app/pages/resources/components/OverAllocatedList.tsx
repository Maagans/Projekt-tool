import { formatWeekLabel } from '../../../../utils/format';

type OverAllocatedListProps = {
  overAllocatedSet: Set<string>;
};

export const OverAllocatedList = ({ overAllocatedSet }: OverAllocatedListProps) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5" data-testid="overallocated-list">
    <h3 className="text-sm font-semibold text-slate-700">Over-allokerede uger</h3>
    {overAllocatedSet.size === 0 ? (
      <p className="mt-2 text-sm text-slate-500">Ingen uger overstiger kapaciteten i den valgte periode.</p>
    ) : (
      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {Array.from(overAllocatedSet)
          .sort((a, b) => a.localeCompare(b))
          .map((week) => (
            <li key={week} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-600">
              {formatWeekLabel(week)}
            </li>
          ))}
      </ul>
    )}
  </div>
);
