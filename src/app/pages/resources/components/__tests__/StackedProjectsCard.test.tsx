import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StackedProjectsCard } from '../StackedProjectsCard';
import type { ProjectStackChartConfig } from '../../resourceAnalyticsStacking';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
});

const createChartConfig = (): ProjectStackChartConfig => ({
  data: [
    {
      week: '2024-W01',
      plannedTotal: 40,
      actualTotal: 32,
      overBaseline: false,
      planned_alpha: 20,
      planned_beta: 20,
      actual_alpha: 18,
      actual_beta: 14,
    },
  ],
  plannedAreas: [
    { dataKey: 'planned_alpha', projectId: 'alpha', projectName: 'Projekt Alpha', color: '#2563eb', variant: 'planned' },
    { dataKey: 'planned_beta', projectId: 'beta', projectName: 'Projekt Beta', color: '#7c3aed', variant: 'planned' },
  ],
  actualAreas: [
    { dataKey: 'actual_alpha', projectId: 'alpha', projectName: 'Projekt Alpha', color: '#2563eb', variant: 'actual' },
    { dataKey: 'actual_beta', projectId: 'beta', projectName: 'Projekt Beta', color: '#7c3aed', variant: 'actual' },
  ],
  legendEntries: [
    { projectId: 'alpha', projectName: 'Projekt Alpha', color: '#2563eb', planned: 20, actual: 18 },
    { projectId: 'beta', projectName: 'Projekt Beta', color: '#7c3aed', planned: 20, actual: 14 },
  ],
  overBaselineWeeks: [],
  overBaselineRanges: [],
});

describe('StackedProjectsCard', () => {
  it('renders summary header and legend items', () => {
    render(
      <StackedProjectsCard
        chart={createChartConfig()}
        baselineHoursWeek={10}
        baselineTotalHours={120}
      />,
    );

    expect(screen.getByText('Stacked belastning pr. projekt')).toBeInTheDocument();
    expect(screen.getByTestId('stacked-projects-card')).toBeInTheDocument();
    expect(screen.getByText('Baseline: 10 t/uge')).toBeInTheDocument();
    expect(screen.getByText('Projekt Alpha')).toBeInTheDocument();
    expect(screen.getByText('Projekt Beta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Planlagt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Faktisk/i })).toBeInTheDocument();
  });
});
