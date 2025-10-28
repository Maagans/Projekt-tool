﻿import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../constants', () => ({ RESOURCES_ANALYTICS_ENABLED: true }));

vi.mock('../../components/AppHeader', () => ({
  AppHeader: ({ children }: { children?: ReactNode }) => <div data-testid="app-header">{children}</div>,
}));

vi.mock('../../../hooks/useProjectManager', () => ({
  useProjectManager: vi.fn(),
}));

vi.mock('../../../hooks/useResourceAnalytics', () => ({
  useResourceAnalytics: vi.fn(),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="chart">{children}</div>,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceArea: () => null,
}));

import { ResourceAnalyticsPage } from './ResourceAnalyticsPage';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { useResourceAnalytics } from '../../../hooks/useResourceAnalytics';

const mockProjectManager = useProjectManager as unknown as Mock;
const mockResourceAnalytics = useResourceAnalytics as unknown as Mock;

const createProjectManagerMock = () => ({
  logout: vi.fn(),
  currentUser: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'Administrator' },
  isSaving: false,
  apiError: null,
  isAdministrator: true,
  employees: [
    { id: 'e1', name: 'Alice', email: 'alice@example.com', department: 'IT' },
    { id: 'e2', name: 'Bob', email: 'bob@example.com', department: 'HR' },
  ],
});

const createAnalyticsResult = () => ({
  data: {
    scope: { type: 'department', id: 'IT' },
    series: [
      { week: '2025-W01', capacity: 100, planned: 90, actual: 85 },
      { week: '2025-W02', capacity: 100, planned: 110, actual: 120 },
    ],
    overAllocatedWeeks: ['2025-W02'],
    overAllocatedWeeksSet: new Set(['2025-W02']),
    hasData: true,
    hasOverAllocation: true,
    range: { fromWeek: '2025-W01', toWeek: '2025-W02' },
    latestPoint: { week: '2025-W02', capacity: 100, planned: 110, actual: 120 },
    summary: {
      totalCapacity: 200,
      totalPlanned: 200,
      totalActual: 205,
      averageCapacity: 100,
      averagePlanned: 100,
      averageActual: 102.5,
      weeks: 2,
    },
    cumulativeSeries: [
      { week: '2025-W01', capacity: 100, planned: 90, actual: 85 },
      { week: '2025-W02', capacity: 200, planned: 200, actual: 205 },
    ],
  },
  isPending: false,
  isFetching: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
});

describe('ResourceAnalyticsPage', () => {
  beforeEach(() => {
    mockProjectManager.mockReset();
    mockResourceAnalytics.mockReset();
    mockProjectManager.mockImplementation(createProjectManagerMock);
    mockResourceAnalytics.mockImplementation(createAnalyticsResult);
  });

  it('renders summary cards and chart when data is available', () => {
    render(
      <MemoryRouter>
        <ResourceAnalyticsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Kapacitet (seneste uge)')).toBeInTheDocument();
    expect(screen.getByText('Planlagt (seneste uge)')).toBeInTheDocument();
    expect(screen.getAllByText('Over-allokerede uger').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Opsummeret' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kumulativ' })).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kumulativ' }));
    expect(screen.getByText('Kumulativ kapacitet')).toBeInTheDocument();
  });
});
