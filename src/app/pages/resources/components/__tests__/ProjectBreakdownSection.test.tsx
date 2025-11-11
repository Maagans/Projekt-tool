import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectBreakdownSection } from '../ProjectBreakdownSection';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
});

describe('ProjectBreakdownSection', () => {
  it('renders breakdown pies when enabled', () => {
    render(
      <ProjectBreakdownSection
        breakdown={[
          { projectId: '1', projectName: 'Projekt Alpha', planned: 30, actual: 25 },
          { projectId: '2', projectName: 'Projekt Beta', planned: 10, actual: 15 },
        ]}
        totals={{ planned: 40, actual: 40 }}
        isFetching={false}
        showBreakdown
        isAllDepartments={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByText('Projektfordeling')).toBeInTheDocument();
    expect(screen.getByText('Planlagt tid')).toBeInTheDocument();
    expect(screen.getByText('Faktisk tid')).toBeInTheDocument();
  });
});
