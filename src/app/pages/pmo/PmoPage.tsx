import { Fragment, useCallback, useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { RESOURCES_ANALYTICS_ENABLED } from '../../constants';
import { ResourceAnalyticsEmbeddedView } from '../resources/ResourceAnalyticsPage';
import { locations } from '../../../types';
import type { Employee, Location } from '../../../types';
import { ChevronDownIcon, ClockIcon } from '../../../components/Icons';

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

type PmoTabKey = 'overview' | 'resources';

export const PmoPage = () => {
  const navigate = useNavigate();
  const projectManager = useProjectManager();
  const {
    employees,
    projects,
    logout,
    currentUser,
    isSaving,
    isWorkspaceFetching,
    apiError,
    canManage,
    isAdministrator,
    workspaceSettings,
    updatePmoBaselineHoursWeek,
  } = projectManager;
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  });
  const [baselineDraft, setBaselineDraft] = useState<string>(() =>
    String(workspaceSettings.pmoBaselineHoursWeek ?? 0),
  );
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const canShowResourceAnalytics = RESOURCES_ANALYTICS_ENABLED && isAdministrator;
  const viewParam = searchParams.get('view');
  const activeTab: PmoTabKey =
    canShowResourceAnalytics && viewParam === 'resources' ? 'resources' : 'overview';

  useEffect(() => {
    if (!canShowResourceAnalytics && viewParam === 'resources') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('view');
      setSearchParams(nextParams, { replace: true });
    }
  }, [canShowResourceAnalytics, viewParam, searchParams, setSearchParams]);

  useEffect(() => {
    setBaselineDraft(String(workspaceSettings.pmoBaselineHoursWeek ?? 0));
    setBaselineError(null);
  }, [workspaceSettings.pmoBaselineHoursWeek]);

  const handleTabChange = (tab: PmoTabKey) => {
    if (tab === activeTab) return;
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      nextParams.delete('view');
    } else {
      nextParams.set('view', tab);
    }
    setSearchParams(nextParams, { replace: true });
    setExpandedEmployeeId(null);
  };

  const handleBaselineChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setBaselineDraft(value);

      if (value.trim() === '') {
        setBaselineError(null);
        return;
      }

      const parsed = Number(value.replace(',', '.'));
      if (!Number.isFinite(parsed)) {
        setBaselineError('Angiv et gyldigt tal.');
        return;
      }

      if (parsed < 0) {
        setBaselineError('Baseline kan ikke være negativ.');
      } else {
        setBaselineError(null);
      }
    },
    [setBaselineDraft, setBaselineError],
  );

  const commitBaseline = useCallback(() => {
    const raw = baselineDraft.trim();
    if (raw === '') {
      setBaselineError(null);
      if (workspaceSettings.pmoBaselineHoursWeek !== 0) {
        updatePmoBaselineHoursWeek(0);
      }
      setBaselineDraft('0');
      return;
    }

    const parsed = Number(raw.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setBaselineError('Angiv et gyldigt tal.');
      return;
    }

    const clamped = Math.max(0, parsed);
    if (parsed < 0) {
      setBaselineError('Baseline kan ikke være negativ. Justeret til 0.');
    } else {
      setBaselineError(null);
    }

    if (clamped !== workspaceSettings.pmoBaselineHoursWeek) {
      updatePmoBaselineHoursWeek(clamped);
    }
    setBaselineDraft(String(clamped));
  }, [
    baselineDraft,
    setBaselineDraft,
    setBaselineError,
    updatePmoBaselineHoursWeek,
    workspaceSettings.pmoBaselineHoursWeek,
  ]);

  const handleBaselineKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitBaseline();
      }
    },
    [commitBaseline],
  );

  const savedBaselineLabel = useMemo(
    () =>
      new Intl.NumberFormat('da-DK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(workspaceSettings.pmoBaselineHoursWeek ?? 0),
    [workspaceSettings.pmoBaselineHoursWeek],
  );

  const tabButtonClass = (tab: PmoTabKey) =>
    [
      'rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
      activeTab === tab
        ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
        : 'border-transparent text-slate-600 hover:border-blue-300 hover:text-blue-600',
    ].join(' ');

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
      Location | string,
      EmployeeWorkload[]
    >;

    for (const summary of employeeData) {
      if (!summary.location) continue;
      if (!grouped[summary.location]) {
        grouped[summary.location] = [];
      }
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
      <AppHeader
        title="PMO Ressourceoverblik"
        user={currentUser}
        isSaving={isSaving}
        isRefreshing={isWorkspaceFetching}
        apiError={apiError}
        onLogout={logout}
      >
        <button onClick={() => navigate('/')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">
          Tilbage til Dashboard
        </button>
      </AppHeader>
      <main className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={tabButtonClass('overview')}
              onClick={() => handleTabChange('overview')}
              aria-pressed={activeTab === 'overview'}
            >
              Kapacitetsoversigt
            </button>
            {canShowResourceAnalytics && (
              <button
                type="button"
                className={tabButtonClass('resources')}
                onClick={() => handleTabChange('resources')}
                aria-pressed={activeTab === 'resources'}
              >
                Ressource Analytics
              </button>
            )}
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
                        <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50/50 p-6 shadow-sm">
              <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-blue-100/40 blur-3xl"></div>
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-white/90 p-3 text-blue-600 shadow-sm ring-1 ring-blue-100">
                    <ClockIcon />
                  </div>
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                      Kapacitetsbaseline
                    </span>
                    <h2 className="text-xl font-semibold text-slate-800">PMO baseline (timer/uge)</h2>
                    <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                      Baseline bruges til at vurdere den samlede kapacitet i ressourcerapporter. Brug feltet til at synkronisere PMO&apos;ets forventede kapacitet på tværs af dashboards og Ressource Analytics.
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      <span className="text-slate-500">Senest gemt:</span>
                      <span className="text-slate-800">{savedBaselineLabel} timer/uge</span>
                    </div>
                  </div>
                </div>
                {isAdministrator ? (
                  <div className="w-full max-w-xs rounded-2xl bg-white/90 p-5 shadow-inner ring-1 ring-slate-200">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="pmo-baseline-input">
                      Timer per uge
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        id="pmo-baseline-input"
                        type="number"
                        min={0}
                        step="0.5"
                        value={baselineDraft}
                        onChange={handleBaselineChange}
                        onBlur={commitBaseline}
                        onKeyDown={handleBaselineKeyDown}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-lg font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        inputMode="decimal"
                      />
                      <span className="text-sm font-medium text-slate-500">t/uge</span>
                    </div>
                    {baselineError ? (
                      <p className="mt-2 text-sm text-rose-600">{baselineError}</p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Angiv et tal større end eller lig 0.</p>
                    )}
                    <p className="mt-3 text-xs text-slate-500">Ændringer gemmes automatisk for hele workspace. Brug enter eller klik uden for feltet for at bekræfte.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/90 p-5 text-sm text-slate-700 shadow-inner ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-800">Aktuel baseline</p>
                    <p className="mt-1 text-lg font-semibold text-blue-700">{savedBaselineLabel} timer/uge</p>
                    <p className="mt-2 text-xs text-slate-500">Kontakt en administrator for at opdatere baseline.</p>
                  </div>
                )}
              </div>
            </section>
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
                                                onClick={() => navigate(`/projects/${detail.id}`)}
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
          </>
        ) : (
          <ResourceAnalyticsEmbeddedView />
        )}
      </main>
    </div>
  );
};

export default PmoPage;
