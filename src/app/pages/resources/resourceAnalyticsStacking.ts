import type {
  ResourceAnalyticsStackedProjectTotals,
  ResourceAnalyticsStackedWeek,
} from '../../../hooks/useResourceAnalytics';

export interface StackAreaConfig {
  dataKey: string;
  projectId: string;
  projectName: string;
  color: string;
  variant: 'planned' | 'actual';
}

export interface StackLegendEntry {
  projectId: string;
  projectName: string;
  color: string;
  planned: number;
  actual: number;
}

export interface ProjectStackChartPoint {
  week: string;
  plannedTotal: number;
  actualTotal: number;
  overBaseline: boolean;
  [key: string]: string | number | boolean;
}

export interface ProjectStackChartConfig {
  data: ProjectStackChartPoint[];
  plannedAreas: StackAreaConfig[];
  actualAreas: StackAreaConfig[];
  legendEntries: StackLegendEntry[];
  overBaselineWeeks: string[];
  overBaselineRanges: Array<{ start: string; end: string }>;
}

export const STACKED_PROJECT_COLORS = [
  '#2563eb',
  '#9333ea',
  '#dc2626',
  '#16a34a',
  '#f97316',
  '#0ea5e9',
  '#6366f1',
  '#facc15',
  '#db2777',
];

export const applyAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha.toFixed(2)})`;
};

export const assignStackColors = (
  totals: ResourceAnalyticsStackedProjectTotals[],
): Map<string, string> => {
  const palette = new Map<string, string>();
  totals.forEach((project, index) => {
    const color = STACKED_PROJECT_COLORS[index % STACKED_PROJECT_COLORS.length];
    palette.set(project.projectId, color);
  });
  return palette;
};

const ensureStackKeys = (
  row: ProjectStackChartPoint,
  projectId: string,
) => {
  if (!Object.prototype.hasOwnProperty.call(row, `planned_${projectId}`)) {
    row[`planned_${projectId}`] = 0;
  }
  if (!Object.prototype.hasOwnProperty.call(row, `actual_${projectId}`)) {
    row[`actual_${projectId}`] = 0;
  }
};

const computeOverBaselineRanges = (
  data: ProjectStackChartPoint[],
  baselineHoursWeek: number,
) => {
  if (baselineHoursWeek <= 0) {
    return [];
  }
  const ranges: Array<{ start: string; end: string }> = [];
  let rangeStart: string | null = null;

  data.forEach((point, index) => {
    const isOver = point.overBaseline;
    if (isOver && !rangeStart) {
      rangeStart = point.week;
    }

    if (!isOver && rangeStart) {
      const previous = data[index - 1];
      ranges.push({ start: rangeStart, end: previous.week });
      rangeStart = null;
    }
  });

  if (rangeStart) {
    const last = data[data.length - 1];
    ranges.push({ start: rangeStart, end: last.week });
  }

  return ranges;
};

export const buildProjectStackChartConfig = (
  series: ResourceAnalyticsStackedWeek[],
  totals: ResourceAnalyticsStackedProjectTotals[],
  baselineHoursWeek: number,
): ProjectStackChartConfig => {
  if (series.length === 0 || totals.length === 0) {
    return {
      data: [],
      plannedAreas: [],
      actualAreas: [],
      legendEntries: [],
      overBaselineWeeks: [],
      overBaselineRanges: [],
    };
  }

  const palette = assignStackColors(totals);

  const plannedAreas: StackAreaConfig[] = totals.map((project) => ({
    dataKey: `planned_${project.projectId}`,
    projectId: project.projectId,
    projectName: project.projectName,
    color: palette.get(project.projectId) ?? STACKED_PROJECT_COLORS[0],
    variant: 'planned',
  }));

  const actualAreas: StackAreaConfig[] = totals.map((project) => ({
    dataKey: `actual_${project.projectId}`,
    projectId: project.projectId,
    projectName: project.projectName,
    color: palette.get(project.projectId) ?? STACKED_PROJECT_COLORS[0],
    variant: 'actual',
  }));

  const data: ProjectStackChartPoint[] = series.map((entry) => {
    const row: ProjectStackChartPoint = {
      week: entry.week,
      plannedTotal: entry.plannedTotal,
      actualTotal: entry.actualTotal,
      overBaseline: baselineHoursWeek > 0 && entry.actualTotal > baselineHoursWeek,
    };

    totals.forEach((project) => {
      ensureStackKeys(row, project.projectId);
    });

    entry.planned.forEach((project) => {
      row[`planned_${project.projectId}`] = project.hours;
    });
    entry.actual.forEach((project) => {
      row[`actual_${project.projectId}`] = project.hours;
    });

    return row;
  });

  const overBaselineWeeks = data
    .filter((point) => point.overBaseline)
    .map((point) => point.week);

  return {
    data,
    plannedAreas,
    actualAreas,
    legendEntries: totals.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      color: palette.get(project.projectId) ?? STACKED_PROJECT_COLORS[0],
      planned: project.planned,
      actual: project.actual,
    })),
    overBaselineWeeks,
    overBaselineRanges: computeOverBaselineRanges(data, baselineHoursWeek),
  };
};
