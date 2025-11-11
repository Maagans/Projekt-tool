import { useMemo } from 'react';
import { ProjectDistributionPie, type ProjectDistributionItem } from './ProjectDistributionPie';

type BreakdownItem = {
  projectId: string;
  projectName: string;
  planned: number;
  actual: number;
};

type BreakdownTotals = {
  planned: number;
  actual: number;
};

const PROJECT_COLORS = ['#2563eb', '#7c3aed', '#ef4444', '#10b981', '#f97316', '#0ea5e9', '#8b5cf6', '#f59e0b'];

const buildChartItems = (breakdown: BreakdownItem[], key: 'planned' | 'actual', total: number): ProjectDistributionItem[] =>
  breakdown.map((item, index) => {
    const value = item[key];
    const percent = total > 0 ? Math.max((value / total) * 100, 0) : 0;
    return {
      id: item.projectId,
      label: item.projectName,
      value,
      percent,
      percentLabel: `${percent.toFixed(1)}%`,
      color: PROJECT_COLORS[index % PROJECT_COLORS.length],
    };
  });

type ProjectBreakdownSectionProps = {
  breakdown: BreakdownItem[];
  totals: BreakdownTotals;
  isFetching: boolean;
  showBreakdown: boolean;
  isAllDepartments: boolean;
  onToggle: () => void;
};

export const ProjectBreakdownSection = ({
  breakdown,
  totals,
  isFetching,
  showBreakdown,
  isAllDepartments,
  onToggle,
}: ProjectBreakdownSectionProps) => {
  const plannedItems = useMemo(() => buildChartItems(breakdown, 'planned', totals.planned), [breakdown, totals.planned]);
  const actualItems = useMemo(() => buildChartItems(breakdown, 'actual', totals.actual), [breakdown, totals.actual]);
  const toggleLabel = showBreakdown ? 'Skjul projektfordeling' : 'Vis projektfordeling';

  return (
    <section className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-700">Projektfordeling</h3>
          <p className="text-sm text-slate-500">
            {isAllDepartments
              ? 'Fordeling af planlagt og faktisk tid på aktive projekter på tværs af alle afdelinger.'
              : 'Fordeling af planlagt og faktisk tid på aktive projekter for den valgte afdeling.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={showBreakdown}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            showBreakdown
              ? 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
              : 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
          }`}
        >
          {toggleLabel}
        </button>
      </header>

      {showBreakdown && (
        <div className="grid gap-8 lg:grid-cols-2">
          <ProjectDistributionPie title="Planlagt tid" items={plannedItems} total={totals.planned} isLoading={isFetching} />
          <ProjectDistributionPie title="Faktisk tid" items={actualItems} total={totals.actual} isLoading={isFetching} />
        </div>
      )}
    </section>
  );
};
