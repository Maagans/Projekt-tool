import type { ReactNode } from 'react';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../constants', () => ({ RESOURCES_ANALYTICS_ENABLED: true }));

vi.mock('../../components/AppHeader', () => ({
  AppHeader: ({ children }: { children?: ReactNode }) => <div data-testid="app-header">{children}</div>,
}));

vi.mock('../../../components/Icons', () => ({
  ChevronDownIcon: () => <span data-testid="chevron-icon" />,
  ClockIcon: () => <span data-testid="clock-icon" />,
}));

vi.mock('../../../hooks/useProjectManager', () => ({
  useProjectManager: vi.fn(),
}));

vi.mock('../resources/ResourceAnalyticsPage', () => ({
  ResourceAnalyticsEmbeddedView: () => <div data-testid="resource-analytics-view">Analytics</div>,
}));

import { PmoPage } from './PmoPage';
import { useProjectManager } from '../../../hooks/useProjectManager';

const mockUseProjectManager = useProjectManager as unknown as Mock;

const baseEmployee = {
  id: 'emp-1',
  name: 'Alice Andersen',
  email: 'alice@example.com',
  department: 'IT',
  location: 'Sano Aarhus',
};

const baseProject = {
  id: 'proj-1',
  status: 'active',
  config: { projectName: 'Optimering' },
  projectMembers: [
    {
      employeeId: 'emp-1',
      timeEntries: [
        { weekKey: '2025-W01', plannedHours: 10, actualHours: 8 },
        { weekKey: '2025-W02', plannedHours: 12, actualHours: 12 },
      ],
    },
  ],
} as const;

const createProjectManagerValue = (overrides: Record<string, unknown> = {}) => ({
  employees: [baseEmployee],
  projects: [baseProject as unknown as any],
  logout: vi.fn(),
  currentUser: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'Administrator' },
  isSaving: false,
  apiError: null,
  canManage: true,
  isAdministrator: true,
  workspaceSettings: { pmoBaselineHoursWeek: 180 },
  updatePmoBaselineHoursWeek: vi.fn(),
  ...overrides,
});

const renderWithRouter = (initialEntry = '/pmo') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/pmo" element={<PmoPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('PmoPage', () => {
  beforeEach(() => {
    mockUseProjectManager.mockReset();
  });

  it('shows overview content by default and renders resource tab for administratorer', () => {
    mockUseProjectManager.mockReturnValue(createProjectManagerValue());

    renderWithRouter();

    expect(screen.getByText('PMO baseline (timer/uge)')).toBeInTheDocument();
    expect(screen.getByLabelText('Timer per uge')).toHaveValue(180);
    const savedChip = screen.getByText(/Senest gemt/).parentElement;
    expect(savedChip).not.toBeNull();
    expect(savedChip).toHaveTextContent('180 timer/uge');
    expect(screen.getByRole('button', { name: 'Kapacitetsoversigt' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ressource Analytics' })).toBeInTheDocument();
    expect(screen.getByText('Filter (kun aktive projekter)')).toBeInTheDocument();
    expect(screen.getByText('Alice Andersen')).toBeInTheDocument();
    expect(screen.queryByTestId('resource-analytics-view')).toBeNull();
  });

  it('lader administrator opdatere baseline og validerer negative værdier', () => {
    const updateMock = vi.fn();
    mockUseProjectManager.mockReturnValue(
      createProjectManagerValue({ updatePmoBaselineHoursWeek: updateMock }),
    );

    renderWithRouter();

    const input = screen.getByLabelText('Timer per uge') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.blur(input);

    expect(updateMock).toHaveBeenCalledWith(200);

    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.blur(input);

    expect(updateMock).toHaveBeenLastCalledWith(0);
    expect(screen.getByText(/Justeret til 0/)).toBeInTheDocument();
    expect(input).toHaveValue(0);
  });

  it('activates resource fanen når query-parameteren er sat', () => {
    mockUseProjectManager.mockReturnValue(createProjectManagerValue());

    renderWithRouter('/pmo?view=resources');

    expect(screen.getByTestId('resource-analytics-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ressource Analytics' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Filter (kun aktive projekter)')).toBeNull();
  });

  it('åbner resource fanen når brugeren klikker på tabben', () => {
    mockUseProjectManager.mockReturnValue(createProjectManagerValue());

    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: 'Ressource Analytics' }));

    expect(screen.getByTestId('resource-analytics-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ressource Analytics' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('viser ikke resource fanen for ikke-administratorer', () => {
    mockUseProjectManager.mockReturnValue(createProjectManagerValue({ isAdministrator: false }));

    renderWithRouter('/pmo?view=resources');

    expect(screen.queryByRole('button', { name: 'Ressource Analytics' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Kapacitetsoversigt' })).toBeInTheDocument();
    expect(screen.getByText('Filter (kun aktive projekter)')).toBeInTheDocument();
    expect(screen.getByText('Aktuel baseline')).toBeInTheDocument();
    const baselineValues = screen.getAllByText('180 timer/uge');
    expect(baselineValues.length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Timer per uge')).toBeNull();
    expect(screen.queryByTestId('resource-analytics-view')).toBeNull();
  });
});


