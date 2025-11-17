import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

vi.mock('./ProjectLayout', () => ({
  useProjectRouteContext: vi.fn(),
}));

import { useProjectRouteContext } from './ProjectLayout';
import { ProjectOverviewPage } from './ProjectOverviewPage';

const mockRouteContext = useProjectRouteContext as unknown as Mock;

const createProjectState = () => ({
  statusItems: [],
  challengeItems: [],
  nextStepItems: [],
  mainTableRows: [],
  risks: [],
  phases: [],
  milestones: [],
  deliverables: [],
  kanbanTasks: [],
});

const createRouteContext = (overrides: Record<string, unknown> = {}) => ({
  project: {
    id: 'proj-1',
    status: 'active',
    config: {
      projectName: 'Apollo',
      projectStartDate: '2025-01-01',
      projectEndDate: '2025-12-31',
      projectGoal: '',
      businessCase: '',
      totalBudget: null,
    },
    reports: [],
    projectMembers: [],
    ...overrides,
  },
  projectManager: {
    canManage: true,
  },
});

const renderPage = (contextOverrides?: Record<string, unknown>) => {
  mockRouteContext.mockReturnValue(createRouteContext(contextOverrides));
  return render(
    <MemoryRouter>
      <ProjectOverviewPage />
    </MemoryRouter>,
  );
};

describe('ProjectOverviewPage', () => {
  beforeEach(() => {
    mockRouteContext.mockReset();
  });

  it('viser tomme tilstande når projektet mangler mål eller rapporter', () => {
    renderPage();

    expect(screen.getByText(/Ingen mål er gemt endnu/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingen rapporter fundet/i)).toBeInTheDocument();
    expect(screen.getByText(/Berig projektet med rapporter for at se KPI/i)).toBeInTheDocument();
    expect(screen.getByText('Ikke angivet')).toBeInTheDocument();
  });

  it('viser projektdata og seneste rapport når de eksisterer', () => {
    renderPage({
      config: {
        projectName: 'Apollo',
        projectStartDate: '2025-01-01',
        projectEndDate: '2025-12-31',
        projectGoal: '<p>Leverer <strong>ny platform</strong></p>',
        businessCase: '<p>ROI på 120%</p>',
        totalBudget: 1500000,
      },
      reports: [
        { id: 'rep-1', weekKey: '2025-W03', state: createProjectState() },
        { id: 'rep-2', weekKey: '2025-W05', state: createProjectState() },
      ],
    });

    expect(screen.getByText('Leverer ny platform')).toBeInTheDocument();
    expect(screen.getByText('ROI på 120%')).toBeInTheDocument();
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Seneste rapport:/i)).toBeInTheDocument();
    expect(screen.getByText('Uge 5 · 2025')).toBeInTheDocument();
    expect(screen.queryByText(/Ingen rapporter fundet/i)).toBeNull();
  });
});
