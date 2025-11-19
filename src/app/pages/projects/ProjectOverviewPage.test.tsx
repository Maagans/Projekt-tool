import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import type { Project, ProjectState, Employee } from '../../../types';

vi.mock('./ProjectLayout', () => ({
  useProjectRouteContext: vi.fn(),
}));

import { useProjectRouteContext } from './ProjectLayout';
import { ProjectOverviewPage } from './ProjectOverviewPage';

const mockRouteContext = useProjectRouteContext as unknown as Mock;

type MockRouteContext = {
  project: Project;
  projectManager: {
    canManage: boolean;
    employees: Employee[];
  };
};

const createProjectState = (): ProjectState => ({
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

const createBaseContext = (): MockRouteContext => ({
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
    permissions: {
      canEdit: true,
      canLogTime: true,
    },
  },
  projectManager: {
    canManage: true,
    employees: [],
  },
});

type RouteContextOverrides = {
  project?: Partial<MockRouteContext['project']>;
  projectManager?: Partial<MockRouteContext['projectManager']>;
};

const createRouteContext = (overrides: RouteContextOverrides = {}) => {
  const base = createBaseContext();
  return {
    project: {
      ...base.project,
      ...(overrides.project ?? {}),
    },
    projectManager: {
      ...base.projectManager,
      ...(overrides.projectManager ?? {}),
    },
  };
};

const renderPage = (contextOverrides?: RouteContextOverrides) => {
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

    expect(screen.getByText(/Tilføj projektmål/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingen timeplan registreret endnu/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingen næste skridt er angivet/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingen risici registreret i seneste rapport/i)).toBeInTheDocument();
  });

  it('viser projektdata, KPI og risici når data findes', () => {
    const populatedState = {
      ...createProjectState(),
      nextStepItems: [{ id: 'step-1', content: '<p>Deploy alfa</p>' }],
      risks: [
        { id: 'risk-1', name: 'Datacenter nedbrud', s: 4, k: 5 },
        { id: 'risk-2', name: 'Leverandør forsinkelse', s: 3, k: 4 },
      ],
    };

    renderPage({
      project: {
        config: {
          projectName: 'Apollo',
          projectStartDate: '2025-01-01',
          projectEndDate: '2025-03-01',
          projectGoal: '<p>Leverer <strong>ny platform</strong></p>',
          businessCase: '<p>ROI på 120%</p>',
          totalBudget: 1500000,
        },
        reports: [
          { id: 'rep-1', weekKey: '2025-W03', state: createProjectState() },
          { id: 'rep-2', weekKey: '2025-W05', state: populatedState },
        ],
        projectMembers: [
          {
            id: 'member-1',
            employeeId: 'emp-1',
            role: 'Projektleder',
            group: 'projektgruppe',
            isProjectLead: true,
            timeEntries: [{ weekKey: '2025-W05', plannedHours: 40, actualHours: 30 }],
          },
          {
            id: 'member-2',
            employeeId: 'emp-2',
            role: 'Arkitekt',
            group: 'styregruppe',
            timeEntries: [{ weekKey: '2025-W05', plannedHours: 20, actualHours: 20 }],
          },
        ],
      },
      projectManager: {
        employees: [
          { id: 'emp-1', name: 'Sara Holm', email: 'sara@example.com' },
          { id: 'emp-2', name: 'Jonas Nyborg', email: 'jonas@example.com' },
        ],
      },
    });

    expect(screen.getAllByText(/ny platform/i).length).toBeGreaterThan(0);
    expect(screen.getByText('ROI på 120%')).toBeInTheDocument();
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
    expect(screen.getAllByText(/Uge 5/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/83%/)).toBeInTheDocument();
    expect(screen.getByText(/Datacenter nedbrud/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sara Holm/i).length).toBeGreaterThan(0);
  });
});
