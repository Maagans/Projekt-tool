import { Fragment, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { locations } from '../../../types';
import type { Employee, Location } from '../../../types';
import { ChevronDownIcon } from '../../../components/Icons';

type EmployeeProjectSummary = {
  id: string;
  name: string;
  planned: number;
  actual: number;
};

type EmployeeWorkload = Employee & {
  totalPlanned: number;
  totalActual: number;
  projectDetails: EmployeeProjectSummary[];
  projectCount: number;
};

const WorkloadBar = ({ planned, actual }: { planned: number; actual: number }) => {
  if (planned === 0) return <span className="text-slate-500">N/A</span>;
  const percentage = Math.round((actual / planned) * 100);
  const color =
    percentage > 100 ? 'bg-red-500' : percentage > 85 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="w-full bg-slate-200 rounded-full h-4" title={`Belastning: ${percentage}%`}>
      <div className={`${color} h-4 rounded-full`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
    </div>
  );
};

export const PmoPage = () => {
  const navigate = useNavigate();
  const projectManager = useProjectManager();
  const { employees, projects, logout, currentUser, isSaving, apiError, canManage } = projectManager;
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  });

  const pmoDataByLocation = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status === 'active');
    const rangeStart = new Date(dateRange.start);
    const rangeEnd = new Date(dateRange.end);

    const employeeData: EmployeeWorkload[] = employees
      .map((employee) => {
        let totalPlanned = 0;
        let totalActual = 0;
        const projectDetails: EmployeeProjectSummary[] = [];

        activeProjects.forEach((project) => {
          const member = project.projectMembers.find((m) => m.employeeId === employee.id);
          if (!member) return;

          let projectPlanned = 0;
          let projectActual = 0;

          member.timeEntries.forEach((entry) => {
            const [yearPart, weekPart] = entry.weekKey.replace('W', '').split('-');
            const year = Number(yearPart);
            const week = Number(weekPart);
            if (!Number.isFinite(year) || !Number.isFinite(week)) {
              return;
            }
            const baseDate = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
            const day = baseDate.getUTCDay();
            const diff = baseDate.getUTCDate() - day + (day === 0 ? -6 : 1);
            const weekDate = new Date(baseDate.setUTCDate(diff));

            if (weekDate >= rangeStart && weekDate <= rangeEnd) {
              projectPlanned += entry.plannedHours;
              projectActual += entry.actualHours;
            }
          });

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
        });

        return {
          ...employee,
          totalPlanned,
          totalActual,
          projectDetails,
          projectCount: projectDetails.length,
        };
      })
      .filter((summary) => summary.totalPlanned > 0 || summary.totalActual > 0);

    const grouped = Object.fromEntries(locations.map((location) => [location, [] as EmployeeWorkload[]])) as Record<
      Location,
      EmployeeWorkload[]
    >;

    for (const summary of employeeData) {
      if (!summary.location) continue;
      grouped[summary.location].push(summary);
    }

    const locationTotals = Object.fromEntries(
      locations.map((location) => {
        const summaries = grouped[location];
        const totals = summaries.reduce(
          (accTotals, summary) => ({
            planned: accTotals.planned + summary.totalPlanned,
            actual: accTotals.actual + summary.totalActual,
          }),
          { planned: 0, actual: 0 },
        );
        return [location, totals] as const;
      }),
    ) as Record<Location, { planned: number; actual: number }>;

    return { grouped, totals: locationTotals };
  }, [employees, projects, dateRange]);

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <AppHeader title="PMO Ressourceoverblik" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
        <button onClick={() => navigate('/')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">
          Tilbage til Dashboard
        </button>
      </AppHeader>
      <main className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <h2 className="text-lg font-bold">Filter (kun aktive projekter)</h2>
            <div>
              <input
                type="date"
                value={dateRange.start}
                onChange={(event) => setDateRange((state) => ({ ...state, start: event.target.value }))}
                className="bg-white border border-slate-300 rounded-md p-2 text-sm"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateRange.end}
                onChange={(event) => setDateRange((state) => ({ ...state, end: event.target.value }))}
                className="bg-white border border-slate-300 rounded-md p-2 text-sm"
              />
            </div>
          </div>
        </div>

        {locations.map((location) => {
          const employeesInLocation = pmoDataByLocation.grouped[location];
          const locationTotals = pmoDataByLocation.totals[location];
          if (!employeesInLocation || employeesInLocation.length === 0) return null;

          return (
            <section key={location} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-700">{location}</h3>
                <div className="flex flex-col text-sm text-slate-500 sm:flex-row sm:items-center sm:gap-4">
                  <span>
                    Planlagt: <strong>{locationTotals.planned.toFixed(1)} timer</strong>
                  </span>
                  <span>
                    Faktisk: <strong>{locationTotals.actual.toFixed(1)} timer</strong>
                  </span>
                </div>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-left text-sm text-slate-600">
                      <th className="p-2 w-12"></th>
                      <th className="p-2">Medarbejder</th>
                      <th className="p-2 w-32 text-right">Planlagt</th>
                      <th className="p-2 w-32 text-right">Faktisk</th>
                      <th className="p-2 w-32">Belastning</th>
                      <th className="p-2 w-20 text-right">Projekter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeesInLocation.map((summary) => {
                      const isExpanded = expandedEmployeeId === summary.id;
                      return (
                        <Fragment key={summary.id}>
                          <tr className="border-b border-slate-100">
                            <td className="p-2 align-middle">
                              {summary.projectCount > 0 && (
                                <button
                                  onClick={() => setExpandedEmployeeId(isExpanded ? null : summary.id)}
                                  className={`p-1 text-slate-500 hover:bg-slate-200 rounded-full transition ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                  title="Vis projektdetaljer"
                                >
                                  <ChevronDownIcon />
                                </button>
                              )}
                            </td>
                            <td className="p-2 text-sm font-medium text-slate-700">
                              {summary.name}{' '}
                              {summary.projectCount > 0 && (
                                <span className="text-xs text-slate-500">({summary.projectCount})</span>
                              )}
                            </td>
                            <td className="p-2 text-right text-sm font-semibold">{summary.totalPlanned.toFixed(1)}</td>
                            <td className="p-2 text-right text-sm font-semibold">{summary.totalActual.toFixed(1)}</td>
                            <td className="p-2 text-sm">
                              <WorkloadBar planned={summary.totalPlanned} actual={summary.totalActual} />
                            </td>
                            <td className="p-2 text-right text-sm text-slate-500">{summary.projectCount}</td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="p-2">
                                <div className="bg-slate-100 p-3 rounded-md">
                                  <table className="w-full rounded bg-white">
                                    <thead>
                                      <tr className="border-b-2 border-slate-200 text-left text-sm text-slate-600">
                                        <th className="p-2">Projekt</th>
                                        <th className="p-2 text-right">Planlagte timer</th>
                                        <th className="p-2 text-right">Faktiske timer</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {summary.projectDetails.map((detail) => (
                                        <tr key={detail.id} className="border-b border-slate-100">
                                          <td
                                            className="p-2 text-sm cursor-pointer text-blue-600 hover:underline"
                                            onClick={() => navigate(`/projects/${detail.id}/reports`)}
                                          >
                                            {detail.name}
                                          </td>
                                          <td className="p-2 text-sm text-right">{detail.planned.toFixed(1)}</td>
                                          <td className="p-2 text-sm text-right">{detail.actual.toFixed(1)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default PmoPage;
