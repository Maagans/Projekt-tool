import { useMemo, useState } from 'react';
import { useMemo, useState } from 'react';
import type { ProjectRisk, ProjectRiskCategoryKey, ProjectRiskStatus } from '../types';

const PROBABILITY_SCALE = [1, 2, 3, 4, 5];
const IMPACT_SCALE = [1, 2, 3, 4, 5];
const PROBABILITY_ROWS = [...PROBABILITY_SCALE].reverse();

const PROBABILITY_LABELS: Record<number, string> = {
  1: 'Meget lav',
  2: 'Lav',
  3: 'Medium',
  4: 'Høj',
  5: 'Meget høj',
};

const IMPACT_LABELS: Record<number, string> = {
  1: 'Meget lille',
  2: 'Lille',
  3: 'Moderat',
  4: 'Stor',
  5: 'Kritisk',
};

const STATUS_META: Record<ProjectRiskStatus, { label: string; badge: string; text: string }> = {
  open: { label: 'Åben', badge: 'bg-amber-50 ring-amber-200/70', text: 'text-amber-800' },
  monitoring: { label: 'Overvåges', badge: 'bg-blue-50 ring-blue-200/70', text: 'text-blue-800' },
  closed: { label: 'Lukket', badge: 'bg-emerald-50 ring-emerald-200/70', text: 'text-emerald-800' },
};

const clampScale = (value: number) => Math.min(5, Math.max(1, Math.round(value)));

const ARCHIVE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const ARCHIVE_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  ...ARCHIVE_DATE_FORMAT,
  hour: '2-digit',
  minute: '2-digit',
};

const formatArchiveDate = (
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('da-DK', options).format(parsed);
};

const getArchivedBadge = (value: string | null | undefined) => {
  const shortLabel = formatArchiveDate(value, ARCHIVE_DATE_FORMAT);
  const longLabel = formatArchiveDate(value, ARCHIVE_DATE_TIME_FORMAT);
  return {
    pill: shortLabel ? `Arkiveret siden ${shortLabel}` : 'Arkiveret',
    title: longLabel ?? undefined,
  };
};

export const PROJECT_RISK_CATEGORY_META: Record<
  ProjectRiskCategoryKey,
  { label: string; badge: string; description: string }
> = {
  technical: {
    label: 'Teknisk',
    badge: 'bg-slate-100 text-slate-700',
    description: 'Arkitektur, systemfejl, integrationer',
  },
  resource: {
    label: 'Ressourcer',
    badge: 'bg-orange-100 text-orange-700',
    description: 'Kapacitet, nøglepersoner, kompetencer',
  },
  scope: {
    label: 'Scope & krav',
    badge: 'bg-indigo-100 text-indigo-700',
    description: 'Uklar scope, ændringer',
  },
  timeline: {
    label: 'Tidsplan',
    badge: 'bg-emerald-100 text-emerald-700',
    description: 'Afhængigheder, leverancer',
  },
  budget: {
    label: 'Økonomi',
    badge: 'bg-rose-100 text-rose-700',
    description: 'Budget, funding, kontrakter',
  },
  compliance: {
    label: 'Compliance & sikkerhed',
    badge: 'bg-red-100 text-red-700',
    description: 'GDPR, audits, sikkerhed',
  },
  other: {
    label: 'Andet',
    badge: 'bg-slate-50 text-slate-600',
    description: 'Øvrige risici',
  },
};

const useRiskGrouping = (risks: ProjectRisk[]) => {
  return useMemo(() => {
    const map = new Map<string, ProjectRisk[]>();
    risks.forEach((risk) => {
      const key = `${risk.probability}-${risk.impact}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(risk);
    });
    return map;
  }, [risks]);
};

const getCellTone = (probability: number, impact: number) => {
  const score = probability * impact;
  if (score >= 20) return 'bg-rose-100';
  if (score >= 12) return 'bg-orange-100';
  if (score >= 6) return 'bg-amber-100';
  return 'bg-emerald-100';
};

const getRiskBadgeTone = (score: number) => {
  if (score >= 20) return 'bg-rose-500 text-white shadow-rose-300/60';
  if (score >= 12) return 'bg-orange-500 text-white shadow-orange-300/60';
  if (score >= 6) return 'bg-amber-500 text-white shadow-amber-300/60';
  return 'bg-emerald-500 text-white shadow-emerald-300/60';
};

const formatDate = (value: string | null | undefined, withTime = false) => {
  if (!value) return 'Ikke angivet';
  try {
    return new Intl.DateTimeFormat('da-DK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...(withTime
        ? {
            hour: '2-digit',
            minute: '2-digit',
          }
        : {}),
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const textOrPlaceholder = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value : 'Ikke angivet';

export type ProjectRiskMatrixProps = {
  risks: ProjectRisk[];
  selectedRiskId: string | null;
  onSelectRisk: (riskId: string) => void;
  onMoveRisk: (riskId: string, probability: number, impact: number) => void;
  disabled?: boolean;
};

export const ProjectRiskMatrix = ({
  risks,
  selectedRiskId,
  onSelectRisk,
  onMoveRisk,
  disabled = false,
}: ProjectRiskMatrixProps) => {
  const groupedRisks = useRiskGrouping(risks);
  const [dragRiskId, setDragRiskId] = useState<string | null>(null);
  const headerDescription = disabled
    ? 'Snapshotvisning. Gå til fanen Risikovurdering for at opdatere risici.'
    : 'Træk eller vælg en risiko og klik i matrixen for at opdatere placeringen.';

  const sortedRisks = useMemo(
    () => [...risks].sort((a, b) => b.score - a.score),
    [risks],
  );
  const riskRankMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedRisks.forEach((risk, index) => map.set(risk.id, index + 1));
    return map;
  }, [sortedRisks]);

  const activeRisk = useMemo(() => {
    if (!risks.length) return null;
    if (selectedRiskId) {
      return risks.find((risk) => risk.id === selectedRiskId) ?? risks[0];
    }
    return sortedRisks[0] ?? risks[0];
  }, [risks, selectedRiskId, sortedRisks]);

  const handleCellAction = (probability: number, impact: number) => {
    if (!selectedRiskId || disabled) return;
    onMoveRisk(selectedRiskId, probability, impact);
  };

  const handleDragStart = (riskId: string) => {
    if (disabled) return;
    setDragRiskId(riskId);
  };

  const handleDrop = (probability: number, impact: number) => {
    if (!dragRiskId || disabled) return;
    onMoveRisk(dragRiskId, probability, impact);
    setDragRiskId(null);
  };

  const handleKeyMove = (
    event: React.KeyboardEvent<HTMLDivElement>,
    probability: number,
    impact: number,
  ) => {
    if (!selectedRiskId || disabled) return;
    let nextProbability = probability;
    let nextImpact = impact;
    switch (event.key) {
      case 'ArrowUp':
        nextProbability = clampScale(probability + 1);
        break;
      case 'ArrowDown':
        nextProbability = clampScale(probability - 1);
        break;
      case 'ArrowLeft':
        nextImpact = clampScale(impact - 1);
        break;
      case 'ArrowRight':
        nextImpact = clampScale(impact + 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    onMoveRisk(selectedRiskId, nextProbability, nextImpact);
  };

  const selectedRiskFallbackId = selectedRiskId ?? activeRisk?.id ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risikoområde</p>
          <h3 className="text-xl font-semibold text-slate-900">Risikomatrix</h3>
          <p className="text-sm text-slate-600">{headerDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1">
            Lav score (1-6)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1">
            Medium (7-15)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1">
            Høj (16-25)
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr),minmax(280px,1.25fr)]">
        <div className="space-y-4">
          <div className="grid grid-cols-[auto,1fr] grid-rows-[auto,1fr,auto] gap-3">
            <div className="flex items-end justify-center pr-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 [writing-mode:vertical-rl] rotate-180">
                Sandsynlighed ↑
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {IMPACT_SCALE.map((value) => (
                <span key={value}>{IMPACT_LABELS[value]}</span>
              ))}
            </div>
            <div className="flex flex-col justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right pr-2">
              {PROBABILITY_ROWS.map((value) => (
                <span key={value}>{PROBABILITY_LABELS[value]}</span>
              ))}
            </div>
            <div className="grid grid-cols-5 grid-rows-5 overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
              {PROBABILITY_ROWS.map((probability) =>
                IMPACT_SCALE.map((impact) => {
                  const key = `${probability}-${impact}`;
                  const cellRisks = groupedRisks.get(key) ?? [];
                  const isActive =
                    selectedRiskFallbackId &&
                    cellRisks.some((risk) => risk.id === selectedRiskFallbackId) &&
                    dragRiskId === null;
                  return (
                    <div
                      key={key}
                      role="gridcell"
                      tabIndex={disabled ? -1 : 0}
                      className={`relative isolate flex h-24 items-center justify-center border border-white/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${getCellTone(
                        probability,
                        impact,
                      )} ${isActive ? 'ring-2 ring-offset-2 ring-blue-200' : ''}`}
                      onClick={() => !disabled && handleCellAction(probability, impact)}
                      onKeyDown={(event) => handleKeyMove(event, probability, impact)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(probability, impact)}
                      aria-label={`Sandsynlighed ${PROBABILITY_LABELS[probability]}, konsekvens ${IMPACT_LABELS[impact]}`}
                    >
                      <div className="pointer-events-none flex flex-wrap items-center justify-center gap-3">
                        {cellRisks.map((risk) => {
                          const isSelected =
                            selectedRiskFallbackId === risk.id || (!selectedRiskId && activeRisk?.id === risk.id);
                          const badgeTone = getRiskBadgeTone(risk.score);
                          const riskRank = riskRankMap.get(risk.id) ?? risk.score;
                          const archivedMeta = risk.isArchived ? getArchivedBadge(risk.projectRiskUpdatedAt) : null;
                          return (
                            <button
                              key={risk.id}
                              type="button"
                              draggable={!disabled}
                              onDragStart={() => handleDragStart(risk.id)}
                              onDragEnd={() => setDragRiskId(null)}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectRisk(risk.id);
                              }}
                              className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 ${badgeTone} ${
                                isSelected ? 'ring-2 ring-white' : 'ring-0'
                              } ${archivedMeta ? 'border-2 border-white/50' : ''}`}
                              aria-label={`${risk.title}: S ${risk.probability} / K ${risk.impact}`}
                            >
                              {riskRank}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
            <div />
            <div className="col-start-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-opacity-75">
              {PROBABILITY_SCALE.map((value) => (
                <span key={value}>{PROBABILITY_LABELS[value]}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-widest text-slate-400">
            Konsekvens →
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-inner">
          {!activeRisk ? (
            <div className="text-sm text-slate-600">
              Ingen risici er tilføjet endnu. Synkroniser eller opret en risiko for at se detaljer her.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Udvalgt risiko</p>
                  <h4 className="text-lg font-semibold text-slate-900">{activeRisk.title}</h4>
                  {activeRisk.isArchived && (
                    <p className="text-xs font-semibold text-red-600">
                      {getArchivedBadge(activeRisk.projectRiskUpdatedAt)?.pill}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_META[activeRisk.status].badge} ${STATUS_META[activeRisk.status].text}`}
                >
                  {STATUS_META[activeRisk.status].label}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
                {textOrPlaceholder(activeRisk.description)}
              </p>
              <dl className="mt-4 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">
                    {activeRisk.score} (S {activeRisk.probability} / K {activeRisk.impact})
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</dt>
                  <dd className="mt-1">
                    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${activeRisk.category.badge}`}>
                      {activeRisk.category.label}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sandsynlighed</dt>
                  <dd className="mt-1">{PROBABILITY_LABELS[activeRisk.probability]}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Konsekvens</dt>
                  <dd className="mt-1">{IMPACT_LABELS[activeRisk.impact]}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ansvarlig</dt>
                  <dd className="mt-1">{activeRisk.owner?.name ?? 'Ikke angivet'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sidst fulgt op</dt>
                  <dd className="mt-1">{formatDate(activeRisk.lastFollowUpAt, true)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Forfaldsdato</dt>
                  <dd className="mt-1">{formatDate(activeRisk.dueDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
                  <dd className="mt-1">{STATUS_META[activeRisk.status].label}</dd>
                </div>
              </dl>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Handlingsplan A</p>
                  <p className="mt-1 rounded-lg bg-white p-3 text-sm text-slate-700 shadow-inner">
                    {textOrPlaceholder(activeRisk.mitigationPlanA)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Handlingsplan B</p>
                  <p className="mt-1 rounded-lg bg-white p-3 text-sm text-slate-700 shadow-inner">
                    {textOrPlaceholder(activeRisk.mitigationPlanB)}
                  </p>
                </div>
                {activeRisk.followUpNotes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Opfølgningsnoter
                    </p>
                    <p className="mt-1 rounded-lg bg-white p-3 text-sm text-slate-700 shadow-inner">
                      {activeRisk.followUpNotes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProjectRiskMatrix;
