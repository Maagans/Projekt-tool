import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectRouteContext } from './ProjectLayout';
import { sanitizeRichText } from '../../../components/RichTextInlineEditor';
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CoinsIcon,
  WarningTriangleIcon,
} from '../../../components/Icons';
import { PROJECT_RISK_ANALYSIS_ENABLED } from '../../constants';

const statusLabels: Record<string, string> = {
  active: 'Aktivt projekt',
  completed: 'Afsluttet projekt',
  'on-hold': 'Sat på pause',
};

const groupLabels: Record<string, string> = {
  styregruppe: 'Styregruppe',
  projektgruppe: 'Projektgruppe',
  partnere: 'Partnere',
  referencegruppe: 'Referencegruppe',
  unassigned: 'Øvrige',
};

const formatWeekLabel = (weekKey: string) => {
  const match = weekKey.match(/(\d{4})-W(\d{1,2})/);
  if (!match) return weekKey;
  const [, year, week] = match;
  return `Uge ${Number(week)} · ${year}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Ukendt dato';
  try {
    const formatter = new Intl.DateTimeFormat('da-DK', { dateStyle: 'medium' });
    return formatter.format(new Date(value));
  } catch {
    return value;
  }
};

const formatBudget = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Ikke angivet';
  }
  const formatter = new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
};

interface OverviewCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

const OverviewCard = ({ title, icon, variant = 'secondary', children }: OverviewCardProps) => {
  const baseClasses =
    variant === 'primary' ? 'bg-slate-50 border border-blue-100' : 'bg-white border border-slate-200';
  const accentClasses =
    variant === 'primary' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600';

  return (
    <section className={`flex h-full flex-col rounded-2xl p-6 shadow-sm ${baseClasses}`}>
      <div className="flex items-center gap-3 text-slate-800">
        <div className={`rounded-2xl p-2 ${accentClasses}`}>{icon}</div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="mt-4 flex flex-1 flex-col text-sm text-slate-600">{children}</div>
    </section>
  );
};

export const ProjectOverviewPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const navigate = useNavigate();

  const latestReport = useMemo(() => {
    if (!project.reports?.length) {
      return null;
    }
    return [...project.reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0];
  }, [project.reports]);

  const heroGoal = sanitizeRichText(project.config.projectGoal ?? '');
  const businessCaseHtml = sanitizeRichText(project.config.businessCase ?? '');
  const heroImageUrl = typeof project.config.heroImageUrl === 'string' ? project.config.heroImageUrl.trim() : null;

  const hoursSummary = useMemo(() => {
    let planned = 0;
    let actual = 0;
    project.projectMembers?.forEach((member) => {
      member.timeEntries?.forEach((entry) => {
        planned += entry.plannedHours ?? 0;
        actual += entry.actualHours ?? 0;
      });
    });
    return { planned, actual };
  }, [project.projectMembers]);

  const capacityRatio = hoursSummary.planned > 0 ? Math.round((hoursSummary.actual / hoursSummary.planned) * 100) : null;

const timeSummary = useMemo(() => {
  if (!project.config.projectEndDate) {
    return null;
  }
  const end = new Date(project.config.projectEndDate);
    if (Number.isNaN(end.getTime())) {
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [project.config.projectEndDate]);

  const daysRemainingLabel = useMemo(() => {
    if (timeSummary === null) {
      return 'Slutdato mangler';
    }
    if (timeSummary === 0) {
      return 'Slutdato i dag';
    }
    if (timeSummary > 0) {
      return `${timeSummary} ${timeSummary === 1 ? 'dag' : 'dage'} tilbage`;
    }
    const daysAgo = Math.abs(timeSummary);
  return `Afsluttet for ${daysAgo} ${daysAgo === 1 ? 'dag' : 'dage'} siden`;
}, [timeSummary]);

  const keyMetrics = useMemo(
    () =>
      [
        { label: 'Status', value: statusLabels[project.status] ?? project.status, icon: <CheckCircleIcon /> },
        { label: 'Projektstart', value: formatDate(project.config.projectStartDate), icon: <CalendarIcon /> },
        { label: 'Projektslut', value: formatDate(project.config.projectEndDate), icon: <CalendarIcon /> },
        { label: 'Budget', value: formatBudget(project.config.totalBudget ?? null), icon: <CoinsIcon /> },
        {
          label: 'Tid til slutdato',
          value: daysRemainingLabel,
          icon: <ClockIcon />,
          detail: latestReport ? `Seneste rapport: ${formatWeekLabel(latestReport.weekKey)}` : 'Ingen rapporter endnu',
        },
      ].filter(Boolean) as { label: string; value: string; icon: ReactNode; detail?: string }[],
    [
      daysRemainingLabel,
      latestReport,
      project.config.projectEndDate,
      project.config.projectStartDate,
      project.config.totalBudget,
      project.status,
    ],
  );

  const employeeLookup = useMemo(() => {
    const map = new Map<string, { name: string; department?: string | null; location?: string | null }>();
    (projectManager.employees ?? []).forEach((employee) => {
      map.set(employee.id, { name: employee.name, department: employee.department ?? null, location: employee.location ?? null });
    });
    return map;
  }, [projectManager.employees]);

  const teamMembers = useMemo(
    () =>
      project.projectMembers?.map((member) => {
        const employee = employeeLookup.get(member.employeeId);
        const department = employee?.department ?? employee?.location ?? 'Ingen afdeling';
        return {
          id: member.id,
          name: employee?.name ?? 'Ukendt medlem',
          role: member.role,
          group: groupLabels[member.group] ?? member.group,
          isLead: Boolean(member.isProjectLead),
          department,
        };
      }) ?? [],
    [employeeLookup, project.projectMembers],
  );

  const riskSnapshots = latestReport?.state.risks;
  const topRisks = useMemo(
    () => [...(riskSnapshots ?? [])].sort((a, b) => b.s * b.k - a.s * a.k).slice(0, 3),
    [riskSnapshots],
  );

  const numberFormatter = useMemo(() => new Intl.NumberFormat('da-DK'), []);

  const nextStepItems = latestReport?.state.nextStepItems ?? [];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-4 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_60%)] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(15,23,42,0.15),_transparent_60%)] opacity-60" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white drop-shadow-sm">{project.config.projectName}</h1>
            {heroGoal ? (
              <div
                className="prose prose-lg mt-2 max-w-4xl text-white/90"
                dangerouslySetInnerHTML={{ __html: heroGoal }}
              />
            ) : (
              <p className="mt-2 max-w-4xl text-lg text-white/90">
                Tilføj projektmål i{' '}
                <button
                  className="font-semibold text-blue-100 underline-offset-2 hover:underline"
                  onClick={() => navigate('settings')}
                >
                  indstillinger
                </button>{' '}
                for at give endnu bedre kontekst.
              </p>
            )}
          </div>
          <div className="flex w-full flex-col gap-4 lg:w-auto">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="rounded-2xl bg-white/10 p-4 text-sm text-white shadow-lg ring-1 ring-white/20 lg:w-[640px] xl:w-[700px]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Projektteam</p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-white/80 underline-offset-2 hover:underline"
                    onClick={() => navigate('organization')}
                  >
                    Se alle
                  </button>
                </div>
                {teamMembers.length ? (
                  <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1 text-xs">
                    {teamMembers.map((member) => (
                      <li key={member.id} className="flex items-center gap-3 text-white/80">
                        <span className="min-w-[180px] font-semibold text-white">
                          {member.name}
                          {member.isLead && <span className="ml-2 text-[10px] text-blue-100">(PL)</span>}
                        </span>
                        <span className="min-w-[200px] truncate text-[11px] text-white/70">
                          {member.role}
                          <span className="ml-2 text-white/60">· {member.department}</span>
                        </span>
                        <span className="ml-auto text-[10px] uppercase text-white/50">{member.group}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-white/70">Ingen medlemmer tilføjet endnu.</p>
                )}
              </div>
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt="Projektvisualisering"
                  className="h-48 w-full rounded-2xl object-cover shadow-lg ring-1 ring-white/40 lg:h-auto lg:max-w-sm"
                />
              ) : (
                <div className="flex h-48 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/50 bg-white/10 text-center text-sm text-white/80 lg:h-auto lg:max-w-sm">
                  <p>Tilføj et hero-billede i indstillinger for at visualisere projektets formål.</p>
                  <button
                    type="button"
                    className="mt-3 rounded-full bg-white/20 px-4 py-1 text-sm font-semibold text-white hover:bg-white/30"
                    onClick={() => navigate('settings')}
                  >
                    Åbn indstillinger
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {keyMetrics.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {keyMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span className="rounded-full bg-slate-100 p-2 text-slate-600">{metric.icon}</span>
                {metric.label}
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-800">{metric.value}</p>
              {'detail' in metric && metric.detail ? (
                <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-slate-50 via-blue-100 to-white p-8 shadow-sm">
            <div className="absolute inset-y-0 right-0 w-1/3 bg-blue-100/40 blur-3xl" />
            <div className="relative space-y-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-500">Business case</p>
              {businessCaseHtml ? (
                <div
                  className="prose prose-lg mt-4 max-w-none text-slate-900 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: businessCaseHtml }}
                />
              ) : (
                <div className="mt-4 text-lg text-slate-700">
                  <p>Tilføj projektets formål eller business case i indstillinger for at få en komplet one-pager.</p>
                </div>
              )}
              <div className="grid gap-4 text-sm text-slate-600 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">Formål</p>
                  <p>Beskriv hvilken strategisk målsætning projektet understøtter.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">Gevinster</p>
                  <p>Angiv forventede effekter, ROI eller KPI&rsquo;er der forbedres.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">Risici / Constraints</p>
                  <p>Hvilke begrænsninger eller risici skal styregruppen kende?</p>
                </div>
              </div>
              <button
                type="button"
                className="mt-6 rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-500"
                onClick={() => navigate('settings')}
              >
                Rediger business case
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Næste skridt</p>
                <p className="text-xs text-slate-500">De seneste opgaver fra projektets rapport</p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 underline-offset-2 hover:underline"
                onClick={() => navigate('reports')}
              >
                Åbn rapporter
              </button>
            </div>
            {nextStepItems.length ? (
              <ol className="mt-5 space-y-4">
                {nextStepItems.slice(0, 5).map((item, index) => (
                  <li key={item.id} className="relative pl-10">
                    <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {index + 1}
                    </span>
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.content) }}
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Ingen næste skridt er angivet i seneste rapport. Tilføj dem i rapportfanen.
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <OverviewCard title="KPI'er" icon={<ClockIcon />}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kapacitetsforbrug</p>
                {capacityRatio !== null ? (
                  <div className="mt-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-2xl font-bold text-slate-900">{capacityRatio}%</span>
                      <span className="text-sm font-semibold text-slate-600">
                        {numberFormatter.format(Math.round(hoursSummary.actual))} / {numberFormatter.format(Math.round(hoursSummary.planned))} t
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(capacityRatio, 150)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Ingen timeplan registreret endnu.</p>
                )}
              </div>
            </div>
          </OverviewCard>

          <OverviewCard title="Top 3 risici" icon={<WarningTriangleIcon />}>
            {topRisks.length ? (
              <ul className="mt-3 space-y-3">
                {topRisks.map((risk) => {
                  const score = risk.s * risk.k;
                  return (
                    <li key={risk.id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                      <p className="text-sm font-semibold text-amber-900">{risk.name}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-amber-800">
                        <span>
                          Score: <span className="font-semibold">{score}</span> ({risk.s}×{risk.k})
                        </span>
                        {risk.status && <span className="capitalize">{risk.status}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">
                Ingen risici registreret i seneste rapport. Tilføj dem under {PROJECT_RISK_ANALYSIS_ENABLED ? 'risikofanen' : 'rapporter'}.
              </p>
            )}
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => navigate(PROJECT_RISK_ANALYSIS_ENABLED ? 'risks' : 'reports')}
            >
              Gå til {PROJECT_RISK_ANALYSIS_ENABLED ? 'risikovurdering' : 'rapporter'}
            </button>
          </OverviewCard>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewPage;
