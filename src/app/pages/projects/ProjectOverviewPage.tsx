import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
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
  const [imageLoadError, setImageLoadError] = useState(false);

  const latestReport = useMemo(() => {
    if (!project.reports?.length) {
      return null;
    }
    return [...project.reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0];
  }, [project.reports]);

  const heroGoal = sanitizeRichText(project.config?.projectGoal ?? '');
  const businessCaseHtml = sanitizeRichText(project.config?.businessCase ?? '');
  const heroImageUrl = typeof project.config?.heroImageUrl === 'string' ? project.config.heroImageUrl.trim() : null;

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
    if (!project.config?.projectEndDate) {
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
  }, [project.config?.projectEndDate]);

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
        {
          label: 'Status',
          value: statusLabels[project.status] ?? project.status,
          icon: <CheckCircleIcon />,
          color: project.status === 'active' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-50',
        },
        { label: 'Projektstart', value: formatDate(project.config?.projectStartDate), icon: <CalendarIcon />, color: 'text-blue-600 bg-blue-50' },
        { label: 'Projektslut', value: formatDate(project.config?.projectEndDate), icon: <CalendarIcon />, color: 'text-purple-600 bg-purple-50' },
        { label: 'Budget', value: formatBudget(project.config?.totalBudget ?? null), icon: <CoinsIcon />, color: 'text-amber-600 bg-amber-50' },
        {
          label: 'Tid til slutdato',
          value: daysRemainingLabel,
          icon: <ClockIcon />,
          color: 'text-indigo-600 bg-indigo-50',
          detail: latestReport ? `Seneste rapport: ${formatWeekLabel(latestReport.weekKey)}` : 'Ingen rapporter endnu',
        },
      ].filter(Boolean) as { label: string; value: string; icon: ReactNode; color: string; detail?: string }[],
    [
      daysRemainingLabel,
      latestReport,
      project.config?.projectEndDate,
      project.config?.projectStartDate,
      project.config?.totalBudget,
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
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-stretch">
          <div className="flex-1 flex flex-col">
            <h1 className="text-3xl font-bold text-white drop-shadow-sm">{project.config?.projectName || 'Nyt projekt'}</h1>
            {heroGoal ? (
              <div className="relative mt-2 max-w-4xl flex-1 min-h-[80px]">
                <div
                  className="absolute inset-0 overflow-y-auto pr-2 prose prose-lg text-white/90 prose-strong:font-bold prose-strong:text-white prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 marker:text-white/70 scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-white/30 hover:scrollbar-thumb-white/50"
                  dangerouslySetInnerHTML={{ __html: heroGoal }}
                />
              </div>
            ) : (
              <p className="mt-2 max-w-4xl text-lg text-white/90">
                Tilføj projektmål i{' '}
                <button
                  className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
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
                  <ul className="mt-3 h-32 space-y-3 overflow-y-auto pr-2">
                    {teamMembers.map((member) => (
                      <li key={member.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-2 transition hover:bg-white/10">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                          {member.name.charAt(0)}
                        </div>
                        <div className="flex flex-1 flex-col overflow-hidden">
                          <span className="truncate text-sm font-medium text-white">
                            {member.name}
                            {member.isLead && <span className="ml-2 rounded bg-blue-500/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-100">PL</span>}
                          </span>
                          <span className="truncate text-xs text-white/60">
                            {member.role} · {member.department}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 text-xs text-white/50">
                    Ingen medlemmer tilføjet endnu.
                  </div>
                )}
              </div>
              {heroImageUrl && !imageLoadError ? (
                <img
                  src={heroImageUrl}
                  alt="Projektvisualisering"
                  className="h-48 w-full rounded-2xl bg-white/5 object-contain shadow-lg ring-1 ring-white/40 lg:h-full lg:max-h-[190px] lg:max-w-sm"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <div className="flex h-48 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/30 bg-white/5 text-center text-sm text-white/80 transition hover:bg-white/10 lg:h-full lg:max-h-[190px] lg:max-w-sm">
                  <p className="px-4">
                    {imageLoadError
                      ? 'Billedet kunne ikke indlæses.'
                      : 'Visualiser projektets formål med et billede.'}
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
                    onClick={() => navigate('settings')}
                  >
                    {imageLoadError ? 'Ret URL i indstillinger' : 'Tilføj billede'}
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
              className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-slate-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-lg font-bold text-slate-800">{metric.value}</p>
                  {'detail' in metric && metric.detail ? (
                    <p className="mt-1 text-[10px] font-medium text-slate-400">{metric.detail}</p>
                  ) : null}
                </div>
                <div className={`rounded-xl p-2.5 ${metric.color} transition-transform group-hover:scale-110`}>
                  {metric.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-blue-50 blur-3xl" />
            <div className="relative space-y-8">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <CoinsIcon />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Business Case</h3>
                </div>
                {businessCaseHtml ? (
                  <div
                    className="prose prose-slate mt-4 max-w-none text-slate-600 prose-headings:font-bold prose-headings:text-slate-800 prose-p:leading-relaxed prose-strong:text-slate-900"
                    dangerouslySetInnerHTML={{ __html: businessCaseHtml }}
                  />
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <p className="text-slate-600">Tilføj projektets formål eller business case i indstillinger for at få en komplet one-pager.</p>
                  </div>
                )}
              </div>

              <div className="grid gap-6 rounded-2xl bg-slate-50 p-6 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Formål</p>
                  <p className="text-sm text-slate-600 leading-relaxed">Beskriv hvilken strategisk målsætning projektet understøtter.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Gevinster</p>
                  <p className="text-sm text-slate-600 leading-relaxed">Angiv forventede effekter, ROI eller KPI&rsquo;er der forbedres.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Risici / Constraints</p>
                  <p className="text-sm text-slate-600 leading-relaxed">Hvilke begrænsninger eller risici skal styregruppen kende?</p>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => navigate('settings')}
              >
                Rediger business case
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <ClockIcon />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Næste skridt</h3>
                  <p className="text-xs text-slate-500">Fra seneste rapport</p>
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                onClick={() => navigate('reports')}
              >
                Åbn rapporter
              </button>
            </div>
            {nextStepItems.length ? (
              <div className="mt-6 space-y-4">
                {nextStepItems.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="group flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 ring-4 ring-white">
                        {index + 1}
                      </div>
                      {index < nextStepItems.length - 1 && <div className="h-full w-px bg-slate-100 group-hover:bg-indigo-50" />}
                    </div>
                    <div
                      className="flex-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 transition group-hover:bg-indigo-50/50"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.content) }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <p className="text-sm text-slate-500">Ingen næste skridt er angivet i seneste rapport.</p>
                <button
                  onClick={() => navigate('reports')}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Tilføj i rapport
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <OverviewCard title="KPI'er" icon={<ClockIcon />}>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Kapacitet</p>
                  {capacityRatio !== null && (
                    <span className={`text-xs font-bold ${capacityRatio > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {capacityRatio}% belægning
                    </span>
                  )}
                </div>
                {capacityRatio !== null ? (
                  <div className="mt-3">
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold text-slate-900">{numberFormatter.format(Math.round(hoursSummary.actual))}</span>
                      <span className="mb-1 text-sm font-medium text-slate-500">/ {numberFormatter.format(Math.round(hoursSummary.planned))} timer</span>
                    </div>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${capacityRatio > 100 ? 'bg-red-500' : capacityRatio > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        style={{ width: `${Math.min(capacityRatio, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Ingen tid registreret.</p>
                )}
              </div>
            </div>
          </OverviewCard>

          <OverviewCard title="Top 3 risici" icon={<WarningTriangleIcon />}>
            {topRisks.length ? (
              <ul className="mt-4 space-y-3">
                {topRisks.map((risk) => {
                  const score = risk.s * risk.k;
                  const severityColor = score >= 15 ? 'bg-red-50 border-red-100 text-red-700' : score >= 8 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700';
                  return (
                    <li key={risk.id} className={`rounded-xl border p-3 ${severityColor}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold">{risk.name}</p>
                        <span className="shrink-0 rounded-full bg-white/50 px-2 py-0.5 text-[10px] font-bold">
                          {score}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs opacity-80">
                        <span>S: {risk.s}</span>
                        <span>K: {risk.k}</span>
                        {risk.status && (
                          <>
                            <span>·</span>
                            <span className="capitalize">{risk.status}</span>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center">
                <p className="text-sm text-slate-500">Ingen risici fundet.</p>
                <button
                  onClick={() => navigate(PROJECT_RISK_ANALYSIS_ENABLED ? 'risks' : 'reports')}
                  className="mt-2 text-xs font-semibold text-slate-600 hover:underline"
                >
                  Opret risiko
                </button>
              </div>
            )}
            <button
              type="button"
              className="mt-6 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
