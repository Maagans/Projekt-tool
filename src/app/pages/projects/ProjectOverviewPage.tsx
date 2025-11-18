import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectRouteContext } from './ProjectLayout';
import { sanitizeRichText } from '../../../components/RichTextInlineEditor';
import {
  CalendarIcon,
  CheckCircleIcon,
  CoinsIcon,
  FileTextIcon,
  LightBulbIcon,
  UserIcon,
} from '../../../components/Icons';

const statusLabels: Record<string, string> = {
  active: 'Aktivt projekt',
  completed: 'Afsluttet projekt',
  'on-hold': 'Sat på pause',
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

  const projectOwner = useMemo(() => {
    const lead = project.projectMembers?.find((member) => member.isProjectLead);
    if (!lead) {
      return null;
    }
    const employee = projectManager.employees?.find((candidate) => candidate.id === lead.employeeId);
    return employee?.name ?? null;
  }, [project.projectMembers, projectManager.employees]);

  const keyMetrics = useMemo(
    () =>
      [
        { label: 'Status', value: statusLabels[project.status] ?? project.status, icon: <CheckCircleIcon /> },
        { label: 'Projektstart', value: formatDate(project.config.projectStartDate), icon: <CalendarIcon /> },
        { label: 'Projektslut', value: formatDate(project.config.projectEndDate), icon: <CalendarIcon /> },
        { label: 'Budget', value: formatBudget(project.config.totalBudget ?? null), icon: <CoinsIcon /> },
        projectOwner ? { label: 'Projektleder', value: projectOwner, icon: <UserIcon /> } : null,
      ].filter(Boolean) as { label: string; value: string; icon: ReactNode }[],
    [project.config.projectEndDate, project.config.projectStartDate, project.config.totalBudget, project.status, projectOwner],
  );

  const nextStepItems = latestReport?.state.nextStepItems ?? [];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-4 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_60%)] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(15,23,42,0.15),_transparent_60%)] opacity-60" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
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
            {projectOwner && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm text-white/80 backdrop-blur">
                <UserIcon />
                Projektleder: <span className="font-semibold text-white">{projectOwner}</span>
              </div>
            )}
          </div>
          <div className="flex flex-1 justify-end">
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt="Projektvisualisering"
                className="h-48 w-full max-w-sm rounded-2xl object-cover shadow-lg ring-1 ring-white/40"
              />
            ) : (
              <div className="flex h-48 w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-dashed border-white/50 bg-white/10 text-center text-sm text-white/80">
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

      {keyMetrics.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${keyMetrics.length}, minmax(0, 1fr))` }}>
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
            </div>
          ))}
        </div>
      )}

      <div className="grid auto-rows-fr grid-cols-[2fr_1fr] gap-8">
        <OverviewCard title="Business case" icon={<CoinsIcon />} variant="primary">
          {businessCaseHtml ? (
            <div
              className="prose prose-sm max-w-none text-slate-800 [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: businessCaseHtml }}
            />
          ) : (
            <div>
              <p>Beskriv kort gevinsterne for at hjælpe styregruppen.</p>
              <button
                type="button"
                className="mt-3 font-semibold text-blue-600 underline-offset-2 hover:underline"
                onClick={() => navigate('settings')}
              >
                Gå til indstillinger
              </button>
            </div>
          )}
        </OverviewCard>

        <OverviewCard title="Statusrapporter" icon={<FileTextIcon />}>
          {latestReport ? (
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="text-slate-700">
                  Seneste rapport: <span className="font-semibold">{formatWeekLabel(latestReport.weekKey)}</span>
                </p>
                <p className="mt-2 text-slate-600">
                  Brug rapportfanen til at gennemgå hovedtavlen, risici og tidslinjer eller for at eksportere PDF.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                onClick={() => navigate('reports')}
              >
                Åbn rapporter
              </button>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="text-slate-600">
                  Berig projektet med rapporter for at se KPI&apos;er og fremhævet status direkte på overblikket.
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Ingen rapporter fundet</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-dashed border-blue-300 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                onClick={() => navigate('reports')}
              >
                Opret første rapport
              </button>
            </div>
          )}
        </OverviewCard>

        <OverviewCard title="Næste skridt" icon={<CheckCircleIcon />}>
          {nextStepItems.length ? (
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {nextStepItems.slice(0, 4).map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.content) }}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">
              Ingen “næste skridt” er tilføjet i seneste rapport.{' '}
              <button
                type="button"
                className="font-semibold text-blue-600 underline-offset-2 hover:underline"
                onClick={() => navigate('reports')}
              >
                Tilføj opgaver i rapportfanen
              </button>
              .
            </p>
          )}
        </OverviewCard>

        <OverviewCard title="Kommende indsigter" icon={<LightBulbIcon />}>
          <p>
            Overblikssiden bliver snart udvidet med KPI-kort, milepæle og risk-nedslag. Indtil da kan du bruge
            tidslinje-, organisations- og risikofaner for at se detaljer.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Fremdrift og budget præsenteres her fra kommende iteration.</li>
            <li>Næste milepæle og nøglepersoner vises automatisk.</li>
            <li>Links guider direkte til relevante faner.</li>
          </ul>
          <button
            type="button"
            className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => navigate('organization')}
          >
            Gå til projektorganisationen
          </button>
        </OverviewCard>
      </div>
    </div>
  );
};

export default ProjectOverviewPage;
