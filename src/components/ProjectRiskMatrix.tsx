import { Fragment, useMemo, useState } from 'react';
import type { ProjectRisk, ProjectRiskCategoryKey } from '../types';

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

  const selectedRiskFallbackId = selectedRiskId ?? sortedRisks[0]?.id ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risikoområde</p>
          <h3 className="text-xl font-semibold text-slate-900">Risikomatrix</h3>
          <p className="text-sm text-slate-600">{headerDescription}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center justify-center pt-6 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            <span>Sandsynlighed</span>
            <span className="text-base">↑</span>
          </div>
          <div className="flex-1 space-y-3">
            <div className="pl-8 sm:pl-12 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {IMPACT_SCALE.map((value) => (
                <span key={value}>{IMPACT_LABELS[value]}</span>
              ))}
            </div>
            <div className="grid grid-cols-[auto,repeat(5,minmax(0,1fr))] overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
              {PROBABILITY_ROWS.map((probability) => (
                <Fragment key={probability}>
                  <div className="flex items-center justify-end border-r border-white/40 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {PROBABILITY_LABELS[probability]}
                  </div>
                  {IMPACT_SCALE.map((impact) => {
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
                            const isSelected = selectedRiskFallbackId === risk.id;
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
                                title={archivedMeta?.title ?? archivedMeta?.pill ?? undefined}
                                aria-label={
                                  archivedMeta
                                    ? `${risk.title}: S ${risk.probability} / K ${risk.impact}. ${archivedMeta.pill}`
                                    : `${risk.title}: S ${risk.probability} / K ${risk.impact}`
                                }
                              >
                                {riskRank}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          <span>Konsekvens</span>
          <span className="text-base">→</span>
        </div>
      </div>
    </section>
  );
};

export default ProjectRiskMatrix;
