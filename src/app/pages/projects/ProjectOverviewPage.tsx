import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectRouteContext } from './ProjectLayout';
import { sanitizeRichText } from '../../../components/RichTextInlineEditor';

const statusLabels: Record<string, string> = {
  active: 'Aktivt projekt',
  completed: 'Afsluttet projekt',
  'on-hold': 'Sat på pause',
};

const stripRichText = (value: string | null | undefined) => {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
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

interface SummaryCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const SummaryCard = ({ title, children, className = '' }: SummaryCardProps) => (
  <section className={`rounded-xl bg-white p-6 shadow-sm ${className}`}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <span className="h-1 w-16 rounded-full bg-blue-100" />
    </div>
    <div className="mt-4 text-sm text-slate-600">{children}</div>
  </section>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-100 px-3 py-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="text-sm font-semibold text-slate-700">{value}</p>
  </div>
);

export const ProjectOverviewPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const navigate = useNavigate();

  const latestReport = useMemo(() => {
    if (!project.reports?.length) {
      return null;
    }
    return [...project.reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0];
  }, [project.reports]);

  const businessCase = stripRichText(project.config.businessCase);
  const businessCaseHtml = sanitizeRichText(project.config.businessCase ?? '');
  const heroGoal = sanitizeRichText(project.config.projectGoal ?? '');

  const projectOwner = useMemo(() => {
    const lead = project.projectMembers?.find((member) => member.isProjectLead);
    if (!lead) {
      return null;
    }
    const employee = projectManager.employees?.find((employee) => employee.id === lead.employeeId);
    return employee?.name ?? null;
  }, [project.projectMembers, projectManager.employees]);

  const heroMetadata: { label: string; value: string }[] = [
    projectOwner ? { label: 'Projektleder', value: projectOwner } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_60%)] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(15,23,42,0.15),_transparent_60%)] opacity-60" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white drop-shadow-sm">{project.config.projectName}</h1>
          {heroGoal ? (
            <div
              className="prose prose-lg mt-2 max-w-4xl text-white/90"
              dangerouslySetInnerHTML={{ __html: heroGoal }}
            />
          ) : (
            <p className="mt-2 max-w-4xl text-lg text-white/90">
              Tilføj projektmål i{' '}
              <button className="font-semibold text-blue-100 underline-offset-2 hover:underline" onClick={() => navigate('settings')}>
                indstillinger
              </button>{' '}
              for at give endnu bedre kontekst.
            </p>
          )}
          {heroMetadata.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
              {heroMetadata.map((item) => (
                <div key={item.label} className="rounded-full border border-white/40 bg-white/20 px-4 py-1 font-medium backdrop-blur-sm">
                  <span className="text-white/70">{item.label}:</span> <span className="text-white">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SummaryCard title="Projektets fundament" className="lg:col-span-2">
        <p>Et hurtigt overblik over nøgledatoer og de nyeste beskrivelser fra projektkonfigurationen.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoRow label="Status" value={statusLabels[project.status] ?? project.status} />
          <InfoRow label="Budget" value={formatBudget(project.config.totalBudget ?? null)} />
          <InfoRow label="Projektstart" value={formatDate(project.config.projectStartDate)} />
          <InfoRow label="Projektslut" value={formatDate(project.config.projectEndDate)} />
        </div>

        <div className="mt-6">
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Business case</p>
            {businessCase ? (
              <div
                className="prose prose-sm mt-1 max-w-none text-slate-800 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: businessCaseHtml }}
              />
            ) : (
              <div className="mt-2 text-sm text-slate-500">
                Beskriv kort gevinsterne for at hjælpe styregruppen.{' '}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={() => navigate('settings')}
                >
                  Gå til indstillinger
                </button>
                .
              </div>
            )}
          </div>
        </div>
      </SummaryCard>

        <SummaryCard title="Statusrapporter">
        {latestReport ? (
          <>
            <p className="text-slate-700">
              Seneste rapport: <span className="font-semibold">{formatWeekLabel(latestReport.weekKey)}</span>
            </p>
            <p className="mt-2 text-slate-600">
              Brug rapportfanen til at gennemgå hovedtavlen, risici og tidslinjer eller for at eksportere PDF.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              onClick={() => navigate('reports')}
            >
              Åbn rapporter
            </button>
          </>
        ) : (
          <>
            <p className="text-slate-600">
              Berig projektet med rapporter for at se KPI&#39;er og fremhævet status direkte på overblikket.
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Ingen rapporter fundet</p>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-dashed border-blue-300 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
              onClick={() => navigate('reports')}
            >
              Opret første rapport
            </button>
          </>
        )}
      </SummaryCard>

        <SummaryCard title="Kommende indsigter">
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
      </SummaryCard>
      </div>
    </div>
  );
};

export default ProjectOverviewPage;
