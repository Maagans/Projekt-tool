import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

const mockProjectManager = useProjectManager as unknown as vi.Mock;
const mockResourceAnalytics = useResourceAnalytics as unknown as vi.Mock;

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

    expect(screen.getByText('Kapacitet')).toBeInTheDocument();
    expect(screen.getByText('Planlagte timer')).toBeInTheDocument();
    expect(screen.getAllByText('Over-allokerede uger').length).toBeGreaterThan(0);
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });
});
