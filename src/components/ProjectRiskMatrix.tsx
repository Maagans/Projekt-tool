import { useMemo, useState } from 'react';
import type { ProjectRisk } from '../types';

const probabilityScale = [1, 2, 3, 4, 5];
const impactScale = [5, 4, 3, 2, 1]; // render high -> low vertically

const getHeatmapClass = (probability: number, impact: number) => {
  const score = probability * impact;
  if (score >= 20) return 'bg-rose-500 text-white';
  if (score >= 12) return 'bg-orange-500 text-white';
  if (score >= 6) return 'bg-amber-400 text-slate-900';
  return 'bg-emerald-400 text-slate-900';
};

const clampScale = (value: number) => Math.min(5, Math.max(1, Math.round(value)));

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

  const handleCellAction = (probability: number, impact: number) => {
    if (!selectedRiskId) return;
    onMoveRisk(selectedRiskId, probability, impact);
  };

  const handleDragStart = (riskId: string) => setDragRiskId(riskId);
  const handleDrop = (probability: number, impact: number) => {
    if (!dragRiskId) return;
    onMoveRisk(dragRiskId, probability, impact);
    setDragRiskId(null);
  };

  const handleKeyMove = (event: React.KeyboardEvent<HTMLButtonElement>, probability: number, impact: number) => {
    if (!selectedRiskId) return;
    let nextProbability = probability;
    let nextImpact = impact;
    switch (event.key) {
      case 'ArrowUp':
        nextImpact = clampScale(impact + 1);
        break;
      case 'ArrowDown':
        nextImpact = clampScale(impact - 1);
        break;
      case 'ArrowLeft':
        nextProbability = clampScale(probability - 1);
        break;
      case 'ArrowRight':
        nextProbability = clampScale(probability + 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    onMoveRisk(selectedRiskId, nextProbability, nextImpact);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Risikomatrix</h3>
          <p className="text-sm text-slate-600">Træk eller vælg en risiko og klik i matrixen for at opdatere placeringen.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1">
            Lav score (1-6)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1">
            Medium (7-15)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1">
            Høj (16-25)
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,45%),1fr]">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-semibold uppercase text-slate-500">
            <span>Sandsynlighed</span>
            <span>Konsekvens</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div role="grid" className="grid grid-cols-5 grid-rows-5">
              {impactScale.map((impact) =>
                probabilityScale.map((probability) => {
                  const key = `${probability}-${impact}`;
                  const cellRisks = groupedRisks.get(key) ?? [];
                  const isActive =
                    selectedRiskId &&
                    cellRisks.some((risk) => risk.id === selectedRiskId) &&
                    dragRiskId === null;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`flex min-h-[70px] flex-col items-center justify-center gap-1 border border-white/20 px-1 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${getHeatmapClass(
                        probability,
                        impact,
                      )} ${isActive ? 'ring-2 ring-offset-2 ring-blue-200' : ''}`}
                      disabled={disabled}
                      onClick={() => handleCellAction(probability, impact)}
                      onKeyDown={(event) => handleKeyMove(event, probability, impact)}
                      role="gridcell"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(probability, impact)}
                      aria-label={`Sandsynlighed ${probability}, konsekvens ${impact}`}
                    >
                      <span>
                        S {probability} / K {impact}
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {cellRisks.map((risk) => (
                          <span
                            key={risk.id}
                            className={`rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white ${
                              selectedRiskId === risk.id ? 'ring-1 ring-white' : ''
                            }`}
                          >
                            {risk.title.slice(0, 3).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                }),
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs font-semibold uppercase text-slate-500">
            <span>Lav</span>
            <span>Høj</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
          {risks.length === 0 ? (
            <p className="text-sm text-slate-500">Ingen risici tilføjet endnu.</p>
          ) : (
            risks.map((risk) => (
              <div
                key={risk.id}
                draggable={!disabled}
                onDragStart={() => handleDragStart(risk.id)}
                onDragEnd={() => setDragRiskId(null)}
                onClick={() => onSelectRisk(risk.id)}
                className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2 text-sm transition ${
                  selectedRiskId === risk.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">{risk.title}</div>
                  <span className="text-xs font-semibold text-slate-500">Score {risk.score}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span>S {risk.probability}</span>
                  <span>K {risk.impact}</span>
                  <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {risk.category.label}
                  </span>
                  {risk.owner?.name && <span>Ansvarlig: {risk.owner.name}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ProjectRiskMatrix;
