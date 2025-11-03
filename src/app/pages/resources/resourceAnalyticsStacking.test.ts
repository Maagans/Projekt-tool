import { describe, it, expect } from 'vitest';
import type {
  ResourceAnalyticsStackedProjectTotals,
  ResourceAnalyticsStackedWeek,
} from '../../../hooks/useResourceAnalytics';
import {
  STACKED_PROJECT_COLORS,
  assignStackColors,
  buildProjectStackChartConfig,
} from './resourceAnalyticsStacking';

describe('resourceAnalyticsStacking helpers', () => {
  it('assigns colors in declaration order and wraps when exceeding palette size', () => {
    const totals: ResourceAnalyticsStackedProjectTotals[] = [
      { projectId: 'a', projectName: 'Alpha', planned: 120, actual: 110 },
      { projectId: 'b', projectName: 'Beta', planned: 90, actual: 95 },
      { projectId: 'c', projectName: 'Gamma', planned: 80, actual: 70 },
      { projectId: 'd', projectName: 'Delta', planned: 60, actual: 50 },
      { projectId: 'e', projectName: 'Epsilon', planned: 40, actual: 30 },
      { projectId: 'f', projectName: 'Zeta', planned: 20, actual: 10 },
      { projectId: 'g', projectName: 'Eta', planned: 10, actual: 5 },
      { projectId: 'h', projectName: 'Theta', planned: 5, actual: 5 },
      { projectId: 'i', projectName: 'Iota', planned: 3, actual: 3 },
      { projectId: 'j', projectName: 'Kappa', planned: 2, actual: 1 },
    ];

    const palette = assignStackColors(totals);

    totals.forEach((project, index) => {
      const expectedColor = STACKED_PROJECT_COLORS[index % STACKED_PROJECT_COLORS.length];
      expect(palette.get(project.projectId)).toBe(expectedColor);
    });
  });

  it('builds stacked chart config with baseline metadata and ranges', () => {
    const series: ResourceAnalyticsStackedWeek[] = [
      {
        week: '2025-W01',
        baseline: 200,
        plannedTotal: 180,
        actualTotal: 150,
        planned: [
          { projectId: 'a', projectName: 'Alpha', hours: 100 },
          { projectId: 'b', projectName: 'Beta', hours: 80 },
        ],
        actual: [
          { projectId: 'a', projectName: 'Alpha', hours: 90 },
          { projectId: 'b', projectName: 'Beta', hours: 60 },
        ],
      },
      {
        week: '2025-W02',
        baseline: 200,
        plannedTotal: 220,
        actualTotal: 240,
        planned: [
          { projectId: 'a', projectName: 'Alpha', hours: 120 },
          { projectId: 'b', projectName: 'Beta', hours: 100 },
        ],
        actual: [
          { projectId: 'a', projectName: 'Alpha', hours: 140 },
          { projectId: 'b', projectName: 'Beta', hours: 100 },
        ],
      },
      {
        week: '2025-W03',
        baseline: 200,
        plannedTotal: 190,
        actualTotal: 210,
        planned: [
          { projectId: 'a', projectName: 'Alpha', hours: 100 },
          { projectId: 'b', projectName: 'Beta', hours: 90 },
        ],
        actual: [
          { projectId: 'a', projectName: 'Alpha', hours: 120 },
          { projectId: 'b', projectName: 'Beta', hours: 90 },
        ],
      },
    ];

    const totals: ResourceAnalyticsStackedProjectTotals[] = [
      { projectId: 'a', projectName: 'Alpha', planned: 320, actual: 350 },
      { projectId: 'b', projectName: 'Beta', planned: 270, actual: 250 },
    ];

    const config = buildProjectStackChartConfig(series, totals, 200);

    expect(config.data).toHaveLength(3);
    expect(config.plannedAreas).toHaveLength(2);
    expect(config.actualAreas).toHaveLength(2);
    expect(config.legendEntries.map((entry) => entry.projectName)).toEqual(['Alpha', 'Beta']);

    const weekTwo = config.data.find((point) => point.week === '2025-W02');
    expect(weekTwo?.['planned_a']).toBe(120);
    expect(weekTwo?.['planned_b']).toBe(100);
    expect(weekTwo?.['actual_a']).toBe(140);
    expect(weekTwo?.['actual_b']).toBe(100);
    expect(weekTwo?.overBaseline).toBe(true);

    expect(config.overBaselineWeeks).toEqual(['2025-W02', '2025-W03']);
    expect(config.overBaselineRanges).toEqual([{ start: '2025-W02', end: '2025-W03' }]);
  });
});
