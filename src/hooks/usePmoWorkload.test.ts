import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePmoWorkload } from './usePmoWorkload';
import type { Employee, Project } from '../types';

const employees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Alice Example',
    email: 'alice@example.com',
    location: 'Sano Aarhus',
  },
  {
    id: 'emp-2',
    name: 'Bob Example',
    email: 'bob@example.com',
    location: 'Sano Middelfart',
  },
  {
    id: 'emp-3',
    name: 'Unused Person',
    email: 'unused@example.com',
    location: 'Sano Aarhus',
  },
];

const baseConfig = {
  projectStartDate: '2024-01-01',
  projectEndDate: '2024-12-31',
};

const projectAlpha: Project = {
  id: 'proj-alpha',
  config: {
    ...baseConfig,
    projectName: 'Alpha',
  },
  reports: [],
  projectMembers: [
    {
      id: 'mem-1',
      employeeId: 'emp-1',
      role: 'Lead',
      group: 'projektgruppe',
      isProjectLead: true,
      timeEntries: [
        { weekKey: '2024-W02', plannedHours: 10, actualHours: 8 },
        { weekKey: '2024-W03', plannedHours: 5, actualHours: 6 },
      ],
    },
    {
      id: 'mem-2',
      employeeId: 'emp-2',
      role: 'Developer',
      group: 'projektgruppe',
      timeEntries: [{ weekKey: '2024-W02', plannedHours: 8, actualHours: 7 }],
    },
  ],
  status: 'active',
  permissions: {
    canEdit: true,
    canLogTime: true,
  },
};

const projectBeta: Project = {
  id: 'proj-beta',
  config: {
    ...baseConfig,
    projectName: 'Beta',
  },
  reports: [],
  projectMembers: [
    {
      id: 'mem-3',
      employeeId: 'emp-1',
      role: 'Lead',
      group: 'projektgruppe',
      timeEntries: [{ weekKey: '2024-W05', plannedHours: 12, actualHours: 11 }],
    },
    {
      id: 'mem-4',
      employeeId: 'emp-2',
      role: 'Developer',
      group: 'projektgruppe',
      timeEntries: [
        { weekKey: '2024-W04', plannedHours: 6, actualHours: 5 },
        { weekKey: '2024-W06', plannedHours: 4, actualHours: 4 },
        { weekKey: 'invalid', plannedHours: 100, actualHours: 100 },
      ],
    },
  ],
  status: 'active',
  permissions: {
    canEdit: true,
    canLogTime: true,
  },
};

const projectArchived: Project = {
  id: 'proj-archived',
  config: {
    ...baseConfig,
    projectName: 'Gamma',
  },
  reports: [],
  projectMembers: [
    {
      id: 'mem-5',
      employeeId: 'emp-1',
      role: 'Lead',
      group: 'projektgruppe',
      timeEntries: [{ weekKey: '2024-W02', plannedHours: 40, actualHours: 40 }],
    },
  ],
  status: 'completed',
  permissions: {
    canEdit: true,
    canLogTime: true,
  },
};

describe('usePmoWorkload', () => {
  it('aggregates workloads per location and employee across active projects', () => {
    const { result } = renderHook(() =>
      usePmoWorkload({
        employees,
        projects: [projectAlpha, projectBeta, projectArchived],
        dateRange: { start: '2024-01-01', end: '2024-03-31' },
      }),
    );

    const aarhus = result.current.grouped['Sano Aarhus'];
    expect(aarhus).toHaveLength(1);
    expect(aarhus[0]).toMatchObject({
      id: 'emp-1',
      totalPlanned: 27,
      totalActual: 25,
      projectCount: 2,
    });
    expect(aarhus[0]?.projectDetails).toEqual([
      { id: 'proj-alpha', name: 'Alpha', planned: 15, actual: 14 },
      { id: 'proj-beta', name: 'Beta', planned: 12, actual: 11 },
    ]);
    expect(result.current.totals['Sano Aarhus']).toEqual({ planned: 27, actual: 25 });

    const middelfart = result.current.grouped['Sano Middelfart'];
    expect(middelfart).toHaveLength(1);
    expect(middelfart[0]).toMatchObject({
      id: 'emp-2',
      totalPlanned: 18,
      totalActual: 16,
      projectCount: 2,
    });
    expect(middelfart[0]?.projectDetails).toEqual([
      { id: 'proj-alpha', name: 'Alpha', planned: 8, actual: 7 },
      { id: 'proj-beta', name: 'Beta', planned: 10, actual: 9 },
    ]);
    expect(result.current.totals['Sano Middelfart']).toEqual({ planned: 18, actual: 16 });
  });

  it('ignores time entries outside the date range or with invalid week keys', () => {
    const { result } = renderHook(() =>
      usePmoWorkload({
        employees,
        projects: [projectAlpha, projectBeta],
        dateRange: { start: '2024-01-01', end: '2024-01-21' },
      }),
    );

    const aarhus = result.current.grouped['Sano Aarhus'];
    expect(aarhus).toHaveLength(1);
    expect(aarhus[0]?.totalPlanned).toBe(15);
    expect(aarhus[0]?.totalActual).toBe(14);
    expect(aarhus[0]?.projectDetails).toEqual([
      { id: 'proj-alpha', name: 'Alpha', planned: 15, actual: 14 },
    ]);

    const middelfart = result.current.grouped['Sano Middelfart'];
    expect(middelfart).toHaveLength(1);
    expect(middelfart[0]?.totalPlanned).toBe(8);
    expect(middelfart[0]?.totalActual).toBe(7);
    expect(middelfart[0]?.projectDetails).toEqual([
      { id: 'proj-alpha', name: 'Alpha', planned: 8, actual: 7 },
    ]);
    expect(result.current.totals['Sano Aarhus']).toEqual({ planned: 15, actual: 14 });
    expect(result.current.totals['Sano Middelfart']).toEqual({ planned: 8, actual: 7 });
  });
});

