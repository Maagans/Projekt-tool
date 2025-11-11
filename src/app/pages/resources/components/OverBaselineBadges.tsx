import { formatWeekLabel } from '../../../../utils/format';

type OverBaselineBadgesProps = {
  weeks: string[];
  baselineHoursWeek: number;
};

export const OverBaselineBadges = ({ weeks, baselineHoursWeek }: OverBaselineBadgesProps) => {
  const sortedWeeks = [...weeks].sort((a, b) => a.localeCompare(b));
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5" data-testid="overbaseline-list">
      <h3 className="text-sm font-semibold text-indigo-700">Uger over baseline</h3>
      {baselineHoursWeek <= 0 ? (
        <p className="mt-2 text-sm text-indigo-600">Definer en baseline for at spore belastningen uge for uge.</p>
      ) : sortedWeeks.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Ingen uger overskrider baseline i den valgte periode.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {sortedWeeks.map((week) => (
            <li key={`baseline-${week}`} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-600">
              {formatWeekLabel(week)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
