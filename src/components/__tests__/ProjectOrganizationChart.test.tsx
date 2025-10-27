import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import React from 'react';
import { ProjectOrganizationChart, TimeLogModal } from '../ProjectOrganizationChart';
import type { Project, ProjectMember, Employee } from '../../types';

const buildProject = (): Project => ({
  id: 'project-1',
  config: {
    projectName: 'Testprojekt',
    projectStartDate: '2025-01-01',
    projectEndDate: '2025-01-31',
  },
  reports: [],
  projectMembers: [],
  status: 'active',
  permissions: {
    canEdit: true,
    canLogTime: true,
  },
});

const buildMember = (overrides?: Partial<ProjectMember>): ProjectMember => ({
  id: 'member-1',
  employeeId: 'employee-1',
  role: 'Udvikler',
  group: 'projektgruppe',
  isProjectLead: false,
  timeEntries: [
    {
      weekKey: '2025-W01',
      plannedHours: 12,
      actualHours: 5,
    },
  ],
  ...overrides,
});

const employee: Employee = {
  id: 'employee-1',
  name: 'Test Person',
  email: 'test@example.com',
  location: 'Sano Aarhus',
};

describe('TimeLogModal', () => {
  const setup = (member: ProjectMember) => {
    const onUpdateTimeLog = vi.fn();
    const onBulkUpdateTimeLog = vi.fn();

    const utils = render(
      <TimeLogModal
        project={buildProject()}
        member={member}
        employee={employee}
        canEditPlanned
        canEditActual
        onClose={() => {}}
        onUpdateTimeLog={onUpdateTimeLog}
        onBulkUpdateTimeLog={onBulkUpdateTimeLog}
      />,
    );

    const weekRow = screen.getByText('2025-W01').closest('div');
    if (!weekRow) {
      throw new Error('Uge-rækken blev ikke fundet i DOM');
    }

    const [plannedInput, actualInput] = within(weekRow).getAllByRole('spinbutton');

    return {
      ...utils,
      plannedInput: plannedInput as HTMLInputElement,
      actualInput: actualInput as HTMLInputElement,
      onUpdateTimeLog,
    };
  };

  it('opdaterer inputværdier, når medlemmet opdateres via props', async () => {
    const user = userEvent.setup();
    const initialMember = buildMember();
    const { rerender, plannedInput, actualInput } = setup(initialMember);

    expect(plannedInput).toHaveValue(12);
    expect(actualInput).toHaveValue(5);

    await user.clear(plannedInput);
    expect(plannedInput.value).toBe('');

    const updatedMember = buildMember({
      timeEntries: [
        {
          weekKey: '2025-W01',
          plannedHours: 7,
          actualHours: 9,
        },
      ],
    });

    rerender(
      <TimeLogModal
        project={buildProject()}
        member={updatedMember}
        employee={employee}
        canEditPlanned
        canEditActual
        onClose={() => {}}
        onUpdateTimeLog={vi.fn()}
        onBulkUpdateTimeLog={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(plannedInput).toHaveValue(7);
      expect(actualInput).toHaveValue(9);
    });
  });

  it('viser tomme felter, når time entry fjernes', async () => {
    const initialMember = buildMember({
      timeEntries: [
        {
          weekKey: '2025-W01',
          plannedHours: 3,
          actualHours: 2,
        },
      ],
    });
    const { rerender, plannedInput, actualInput } = setup(initialMember);

    expect(plannedInput).toHaveValue(3);
    expect(actualInput).toHaveValue(2);

    const clearedMember = buildMember({
      timeEntries: [],
    });

    rerender(
      <TimeLogModal
        project={buildProject()}
        member={clearedMember}
        employee={employee}
        canEditPlanned
        canEditActual
        onClose={() => {}}
        onUpdateTimeLog={vi.fn()}
        onBulkUpdateTimeLog={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(plannedInput.value).toBe('');
      expect(actualInput.value).toBe('');
    });
  });
});

describe('ProjectOrganizationChart', () => {
  const baseProject = buildProject();
  const employees: Employee[] = [employee];
  const createDefaultProps = () => ({
    project: baseProject,
    allEmployees: employees,
    canManageMembers: true,
    canLogTime: true,
    currentUserEmployeeId: null,
    onAssignEmployee: vi.fn(),
    onUpdateMember: vi.fn(),
    onDeleteMember: vi.fn(),
    onUpdateTimeLog: vi.fn(),
    onBulkUpdateTimeLog: vi.fn(),
  });

  it('synkroniserer modalens data, når medlemmets timeEntries ændres', async () => {
    const user = userEvent.setup();
    const membersInitial: ProjectMember[] = [
      {
        id: 'member-1',
        employeeId: 'employee-1',
        role: 'Udvikler',
        group: 'projektgruppe',
        timeEntries: [{ weekKey: '2025-W01', plannedHours: 5, actualHours: 2 }],
      },
    ];

    const defaultProps = createDefaultProps();
    const { rerender } = render(
      <ProjectOrganizationChart {...defaultProps} members={membersInitial} />,
    );

    await user.click(screen.getByRole('button', { name: /åbn timelog/i }));

    const plannedCell = screen.getByTestId('timelog-total-planned');
    const actualCell = screen.getByTestId('timelog-total-actual');

    expect(plannedCell).toHaveTextContent('5.0');
    expect(actualCell).toHaveTextContent('2.0');

    const membersUpdated: ProjectMember[] = [
      {
        id: 'member-1',
        employeeId: 'employee-1',
        role: 'Udvikler',
        group: 'projektgruppe',
        timeEntries: [
          { weekKey: '2025-W01', plannedHours: 5, actualHours: 2 },
          { weekKey: '2025-W02', plannedHours: 7, actualHours: 3 },
        ],
      },
    ];

    rerender(<ProjectOrganizationChart {...defaultProps} members={membersUpdated} />);

    await waitFor(() => {
      expect(plannedCell).toHaveTextContent('12.0');
      expect(actualCell).toHaveTextContent('5.0');
    });
  });

  it('lukker modal når medlemmet fjernes', async () => {
    const user = userEvent.setup();
    const members: ProjectMember[] = [
      {
        id: 'member-1',
        employeeId: 'employee-1',
        role: 'Udvikler',
        group: 'projektgruppe',
        timeEntries: [{ weekKey: '2025-W01', plannedHours: 5, actualHours: 2 }],
      },
    ];

    const defaultProps = createDefaultProps();
    const { rerender } = render(
      <ProjectOrganizationChart {...defaultProps} members={members} />,
    );

    await user.click(screen.getByRole('button', { name: /åbn timelog/i }));
    expect(screen.getByText('Timeregistrering')).toBeInTheDocument();

    rerender(<ProjectOrganizationChart {...defaultProps} members={[]} />);

    await waitFor(() => {
      expect(screen.queryByText('Timeregistrering')).not.toBeInTheDocument();
    });
  });

  it('viser knap med teksten "Tilføj medlem"', () => {
    render(<ProjectOrganizationChart {...createDefaultProps()} members={[]} />);
    expect(screen.getByRole('button', { name: /Tilføj medlem/ })).toBeInTheDocument();
  });
});
