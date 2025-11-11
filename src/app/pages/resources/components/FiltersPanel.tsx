import { RANGE_MODE_OPTIONS, RANGE_OPTIONS, VIEW_OPTIONS } from '../constants';
import type { RangeMode, ViewMode } from '../types';

type FiltersPanelProps = {
  variant: 'page' | 'embedded';
  departments: string[];
  selectedDepartment: string;
  onDepartmentChange: (value: string) => void;
  rangeWeeks: number;
  onRangeWeeksChange: (value: number) => void;
  rangeMode: RangeMode;
  onRangeModeChange: (value: RangeMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  renderDepartmentLabel?: (value: string | null | undefined) => string;
};

export const FiltersPanel = ({
  variant,
  departments,
  selectedDepartment,
  onDepartmentChange,
  rangeWeeks,
  onRangeWeeksChange,
  rangeMode,
  onRangeModeChange,
  viewMode,
  onViewModeChange,
  renderDepartmentLabel,
}: FiltersPanelProps) => {
  const stickyOffset = variant === 'page' ? 'lg:top-28' : 'lg:top-24';
  const hasDepartments = departments.length > 0;
  const formatLabel = renderDepartmentLabel ?? ((value?: string | null) => value ?? '');

  return (
    <aside
      className={`rounded-2xl border border-slate-100 bg-white/85 p-4 shadow-sm backdrop-blur-sm lg:w-80 lg:flex-shrink-0 lg:self-start lg:shadow ${
        hasDepartments ? 'lg:sticky' : ''
      } ${stickyOffset}`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="department-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Afdeling
          </label>
          <select
            id="department-select"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={selectedDepartment}
            onChange={(event) => onDepartmentChange(event.target.value)}
            disabled={!hasDepartments}
          >
            {hasDepartments ? (
              departments.map((department) => (
                <option key={department} value={department}>
                  {formatLabel(department)}
                </option>
              ))
            ) : (
              <option>Ingen afdelinger fundet</option>
            )}
          </select>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</span>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition sm:flex-none ${
                  rangeWeeks === option
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                }`}
                onClick={() => onRangeWeeksChange(option)}
              >
                {option} uger
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tidshorisont</span>
          <div className="flex flex-wrap gap-2">
            {RANGE_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition sm:flex-none ${
                  rangeMode === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                }`}
                onClick={() => onRangeModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visning</span>
          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition sm:flex-none ${
                  viewMode === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                }`}
                onClick={() => onViewModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export type { FiltersPanelProps };
