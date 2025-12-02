import { useMemo } from 'react';
import { locations, type Employee, type Location, type Project } from '../types';

export interface EmployeeProjectSummary {
  id: string;
  name: string;
  planned: number;
  actual: number;
}

export type EmployeeWorkload = Employee & {
  totalPlanned: number;
  totalActual: number;
  projectDetails: EmployeeProjectSummary[];
  projectCount: number;
};

export interface PmoDateRange {
  start: string;
  end: string;
}

export interface PmoWorkloadResult {
  grouped: Record<Location | string, EmployeeWorkload[]>;
  totals: Record<Location, { planned: number; actual: number }>;
}

export interface UsePmoWorkloadInput {
  employees: Employee[];
  projects: Project[];
  dateRange: PmoDateRange;
}

const parseWeekKeyToDate = (weekKey: string): Date | null => {
  const [yearPart, weekPart] = weekKey.replace('W', '').split('-');
  const year = Number(yearPart);
  const week = Number(weekPart);
  if (!Number.isFinite(year) || !Number.isFinite(week)) {
    return null;
  }
  const baseDate = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const day = baseDate.getUTCDay();
  const diff = baseDate.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(baseDate.setUTCDate(diff));
};

const createGroupedTemplate = (): Record<Location | string, EmployeeWorkload[]> =>
  Object.fromEntries(locations.map((location) => [location, [] as EmployeeWorkload[]])) as Record<
    Location | string,
    EmployeeWorkload[]
  >;

export const buildPmoWorkload = (
  employees: Employee[],
  projects: Project[],
  dateRange: PmoDateRange,
): PmoWorkloadResult => {
  const activeProjects = projects.filter((project) => project.status === 'active');
  const rangeStart = new Date(dateRange.start);
  const rangeEnd = new Date(dateRange.end);

  const employeeData = employees
    .map((employee) => {
      let totalPlanned = 0;
      let totalActual = 0;
      const projectDetails: EmployeeProjectSummary[] = [];

      for (const project of activeProjects) {
        const member = project.projectMembers.find((candidate) => candidate.employeeId === employee.id);
        if (!member) continue;

        let projectPlanned = 0;
        let projectActual = 0;

        for (const entry of member.timeEntries) {
          const weekDate = parseWeekKeyToDate(entry.weekKey);
          if (!weekDate) continue;
          if (weekDate < rangeStart || weekDate > rangeEnd) continue;

          projectPlanned += entry.plannedHours;
          projectActual += entry.actualHours;
        }

        if (projectPlanned > 0 || projectActual > 0) {
          totalPlanned += projectPlanned;
          totalActual += projectActual;
          projectDetails.push({
            id: project.id,
            name: project.config.projectName,
            planned: projectPlanned,
            actual: projectActual,
          });
        }
      }

      if (totalPlanned === 0 && totalActual === 0) {
        return null;
      }

      return {
        ...employee,
        totalPlanned,
        totalActual,
        projectDetails,
        projectCount: projectDetails.length,
      };
    })
    .filter((summary): summary is EmployeeWorkload => summary !== null);

  const grouped = createGroupedTemplate();

  for (const summary of employeeData) {
    if (!summary.location) continue;
    if (!grouped[summary.location]) {
      grouped[summary.location] = [];
    }
    grouped[summary.location].push(summary);
  }

  const totals = locations.reduce(
    (acc, location) => {
      const summaries = grouped[location] ?? [];
      const result = summaries.reduce(
        (aggregate, summary) => ({
          planned: aggregate.planned + summary.totalPlanned,
          actual: aggregate.actual + summary.totalActual,
        }),
        { planned: 0, actual: 0 },
      );
      acc[location] = result;
      return acc;
    },
    {} as Record<Location, { planned: number; actual: number }>,
  );

  return { grouped, totals };
};

export const usePmoWorkload = ({ employees, projects, dateRange }: UsePmoWorkloadInput): PmoWorkloadResult => {
  const { start, end } = dateRange;
  return useMemo(() => buildPmoWorkload(employees, projects, { start, end }), [employees, projects, start, end]);
};
