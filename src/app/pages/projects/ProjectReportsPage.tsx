import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { KanbanBoard } from '../../../components/KanbanBoard';
import { Timeline } from '../../../components/Timeline';
import { EditableList } from '../../../components/RichTextEditor';
import { MainStatusTable } from '../../../components/MainStatusTable';
import { DeliverablesList } from '../../../components/DeliverablesList';
import { RiskMatrix } from '../../../components/RiskMatrix';
import { CalendarIcon, PlusIcon, StepForwardIcon, TrashIcon } from '../../../components/Icons';
import { SyncStatusPill } from '../../../components/SyncStatusPill';
import type { Deliverable, Milestone, Phase, ProjectState, Report } from '../../../types';
import { generateId, TimelineItemType, TimelineUpdatePayload } from '../../../hooks/projectManager/utils';
import { useProjectRouteContext } from './ProjectLayout';

const DEFAULT_PHASE_WIDTH = 10;

const getLatestWeekKey = (reports: Report[]): string | null => {
  if (!reports.length) {
    return null;
  }
  return [...reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0].weekKey;
};

const applyTimelineUpdate = (
  state: ProjectState,
  itemType: TimelineItemType,
  id: string,
  payload: TimelineUpdatePayload,
): ProjectState => {
  if (itemType === 'phase') {
    let didUpdate = false;
    const nextPhases = state.phases.map((phase) => {
      if (phase.id !== id) return phase;
      didUpdate = true;
      return { ...phase, ...(payload as Partial<Phase>) };
    });
    return didUpdate ? { ...state, phases: nextPhases } : state;
  }

  if (itemType === 'milestone') {
    let didUpdate = false;
    const nextMilestones = state.milestones.map((milestone) => {
      if (milestone.id !== id) return milestone;
      didUpdate = true;
      return { ...milestone, ...(payload as Partial<Milestone>) };
    });
    return didUpdate ? { ...state, milestones: nextMilestones } : state;
  }

  let didUpdate = false;
  const nextDeliverables = state.deliverables.map((deliverable) => {
    if (deliverable.id !== id) return deliverable;
    didUpdate = true;
    return { ...deliverable, ...(payload as Partial<Deliverable>) };
  });
  return didUpdate ? { ...state, deliverables: nextDeliverables } : state;
};

export const ProjectReportsPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const initialWeekKeyRef = useRef<string | null>(getLatestWeekKey(project.reports));
  const [activeWeekKey, setActiveWeekKey] = useState<string | null>(initialWeekKeyRef.current);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [draftProject, setDraftProject] = useState(project);
  const [isTimelineDirty, setIsTimelineDirty] = useState(false);
  const pendingTimelineStateRef = useRef<{ weekKey: string; state: ProjectState } | null>(null);
  const dirtyWeekKeyRef = useRef<string | null>(initialWeekKeyRef.current);

  const updateDraftReportState = useCallback(
    (updater: (state: ProjectState) => ProjectState) => {
      if (!activeWeekKey) {
        return;
      }
      setDraftProject((prevProject) => {
        const reportIndex = prevProject.reports.findIndex((report) => report.weekKey === activeWeekKey);
        if (reportIndex === -1) {
          return prevProject;
        }
        const currentReport = prevProject.reports[reportIndex];
        const nextState = updater(currentReport.state);
        if (nextState === currentReport.state) {
          return prevProject;
        }
        pendingTimelineStateRef.current = { weekKey: activeWeekKey, state: nextState };
        dirtyWeekKeyRef.current = activeWeekKey;
        setIsTimelineDirty(true);
        const nextReports = [...prevProject.reports];
        nextReports[reportIndex] = { ...currentReport, state: nextState };
        return { ...prevProject, reports: nextReports };
      });
    },
    [activeWeekKey],
  );
  const handleTimelineItemUpdate = useCallback(
    (itemType: TimelineItemType, id: string, payload: TimelineUpdatePayload) => {
      updateDraftReportState((state) => applyTimelineUpdate(state, itemType, id, payload));
    },
    [updateDraftReportState],
  );

  const activeReport = useMemo(
    () => draftProject.reports.find((report) => report.weekKey === activeWeekKey) ?? null,
    [draftProject, activeWeekKey],
  );
  const { canManage } = projectManager;
  const floatingSyncClass = 'fixed bottom-6 right-4 sm:right-6 pointer-events-none z-40 drop-shadow-lg';
  const isTimelineDraftActive = isTimelineDirty && dirtyWeekKeyRef.current === activeWeekKey;
  const resetTimelineDraft = useCallback(() => {
    pendingTimelineStateRef.current = null;
    dirtyWeekKeyRef.current = null;
    setIsTimelineDirty(false);
  }, []);

  useEffect(() => {
    if (isTimelineDirty) {
      return;
    }
    setDraftProject(project);
    setActiveWeekKey((current) => {
      if (project.reports.length === 0) {
        return null;
      }
      if (current && project.reports.some((report) => report.weekKey === current)) {
        return current;
      }
      return getLatestWeekKey(project.reports);
    });
  }, [isTimelineDirty, project]);

  const isBusy = projectManager.isSaving;
  const canEdit = canManage && !isBusy;

  const guardManage = <T extends (...args: any[]) => void>(fn: T, options?: { allowWhileTimelineDraft?: boolean }): T =>
    ((...args: Parameters<T>) => {
      if (!canEdit) return;
      if (!options?.allowWhileTimelineDraft && isTimelineDraftActive) {
        alert('Gem eller fortryd tidslinjen, før du foretager andre ændringer.');
        return;
      }
      fn(...args);
    }) as T;

  const confirmDiscardTimelineChanges = useCallback(() => {
    if (!isTimelineDirty) {
      return true;
    }
    const confirmed = window.confirm('Du har ugemte ændringer i tidslinjen. Vil du kassere dem?');
    if (confirmed) {
      setDraftProject(project);
      resetTimelineDraft();
    }
    return confirmed;
  }, [isTimelineDirty, project, resetTimelineDraft]);

  const handleSaveTimeline = useCallback(() => {
    if (!dirtyWeekKeyRef.current || !pendingTimelineStateRef.current) {
      return;
    }
    const timelineAction = projectManager.projectActions(project.id, dirtyWeekKeyRef.current);
    timelineAction?.reportsManager.replaceState(pendingTimelineStateRef.current.state);
    resetTimelineDraft();
  }, [project.id, projectManager, resetTimelineDraft]);

  const handleDiscardTimelineChanges = useCallback(() => {
    setDraftProject(project);
    resetTimelineDraft();
  }, [project, resetTimelineDraft]);

  const actions = projectManager.projectActions(project.id, activeWeekKey);
  if (!actions) return null;

  const { reportsManager, ...restActions } = actions;

  const handleCreateNext = () => {
    if (isBusy) return;
    if (!confirmDiscardTimelineChanges()) return;
    const newKey = reportsManager.createNext();
    if (newKey) setActiveWeekKey(newKey);
  };

  const handleDeleteReport = (weekKey: string) => {
    if (isBusy) return;
    if (!confirmDiscardTimelineChanges()) return;
    reportsManager.delete(weekKey);
    const remainingReports = project.reports.filter((report) => report.weekKey !== weekKey);
    if (remainingReports.length > 0) {
      setActiveWeekKey(remainingReports.sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0].weekKey);
    } else {
      setActiveWeekKey(null);
    }
  };

  if (project.reports.length === 0) {
    return (
      <div className="text-center bg-white p-10 rounded-lg shadow-sm">
        <h2>Ingen rapporter</h2>
        {canManage && (
          <button onClick={handleCreateNext} className="mt-4 bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600">
            Opret første rapport
          </button>
        )}
      </div>
    );
  }

  if (!activeReport) {
    return (
      <div className="text-center bg-white p-10 rounded-lg shadow-sm">
        <h2>Vælg en rapport fra listen for at se den.</h2>
      </div>
    );
  }

  const { timelineManager, statusListManager, challengeListManager, kanbanManager, riskManager } = restActions;

  return (
    <>
      {isBusy && <SyncStatusPill message="Synkroniserer rapportændringer..." className={floatingSyncClass} />}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <aside className="w-full lg:w-64 flex-shrink-0 bg-white p-4 rounded-lg shadow-sm flex flex-col export-hide self-stretch">
        <h3 className="text-lg font-bold mb-3 text-slate-700">Rapporter</h3>
        {canManage && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setIsNewReportModalOpen(true)}
              disabled={isBusy}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold p-2 rounded-md transition-colors ${
                isBusy ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-blue-600 bg-blue-100 hover:bg-blue-200'
              }`}
              title="Opret ny specifik ugerapport"
            >
              <PlusIcon /> Ny
            </button>
            <button
              onClick={handleCreateNext}
              disabled={isBusy}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold p-2 rounded-md transition-colors ${
                isBusy ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-green-600 bg-green-100 hover:bg-green-200'
              }`}
              title="Opret rapport for næste uge"
            >
              <StepForwardIcon /> Næste
            </button>
          </div>
        )}
        <div className="flex-grow overflow-y-auto -mr-2 pr-2">
          <ul className="space-y-1">
            {project.reports.map((report) => (
              <li key={report.weekKey} className="group relative">
                <button
                  onClick={() => {
                    if (!confirmDiscardTimelineChanges()) return;
                    setActiveWeekKey(report.weekKey);
                  }}
                  className={`w-full text-left p-2 rounded-md text-sm font-medium flex items-center gap-3 ${
                    report.weekKey === activeWeekKey ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  <CalendarIcon />
                  {report.weekKey}
                </button>
                {canManage && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (window.confirm(`Slet rapport for ${report.weekKey}?`)) handleDeleteReport(report.weekKey);
                    }}
                    disabled={isBusy}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${
                      isBusy ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500'
                    } opacity-0 group-hover:opacity-100 transition-opacity`}
                    title="Slet rapport"
                  >
                    <TrashIcon />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main id="report-content" className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 w-full">
        <div className="lg:col-span-2">
          <KanbanBoard
            tasks={activeReport.state.kanbanTasks || []}
            onAddTask={guardManage(kanbanManager.add)}
            onUpdateTask={guardManage(kanbanManager.updateContent)}
            onDeleteTask={guardManage(kanbanManager.delete)}
            onMoveTask={guardManage(kanbanManager.updateStatus)}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {isTimelineDirty && dirtyWeekKeyRef.current === activeWeekKey && (
              <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">Tidslinje ikke gemt</span>
                <button
                  type="button"
                  onClick={handleDiscardTimelineChanges}
                  className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Fortryd
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimeline}
                  disabled={isBusy}
                  className={`rounded px-3 py-1 text-xs font-semibold text-white ${isBusy ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Gem tidslinje
                </button>
              </div>
            )}
            <Timeline
              projectStartDate={project.config.projectStartDate}
              projectEndDate={project.config.projectEndDate}
              phases={activeReport.state.phases}
              milestones={activeReport.state.milestones}
              deliverables={activeReport.state.deliverables}
              calculateDateFromPosition={timelineManager.calculateDateFromPosition}
              calculatePositionFromDate={timelineManager.calculatePositionFromDate}
              monthMarkers={timelineManager.getMonthMarkers()}
              todayPosition={timelineManager.getTodayPosition()}
              addTimelineItem={guardManage(
                (type, position) => {
                updateDraftReportState((state) => {
                  if (type === 'phase') {
                    const newPhase: Phase = {
                      id: generateId(),
                      text: 'Ny fase',
                      start: Math.max(0, Math.min(100, position)),
                      end: Math.min(100, Math.max(position + DEFAULT_PHASE_WIDTH, position)),
                      highlight: 'blue',
                    };
                    return { ...state, phases: [...state.phases, newPhase] };
                  }
                  if (type === 'milestone') {
                    const newMilestone: Milestone = { id: generateId(), text: 'Ny milepæl', position: Math.max(0, Math.min(100, position)) };
                    return { ...state, milestones: [...state.milestones, newMilestone] };
                  }
                  const newDeliverable: Deliverable = { id: generateId(), text: 'Ny leverance', position: Math.max(0, Math.min(100, position)) };
                  return { ...state, deliverables: [...state.deliverables, newDeliverable] };
                });
                },
                { allowWhileTimelineDraft: true },
              )}
              updateTimelineItem={guardManage(handleTimelineItemUpdate, { allowWhileTimelineDraft: true })}
              deleteTimelineItem={guardManage(
                (type, id) => {
                updateDraftReportState((state) => {
                  if (type === 'phase') {
                    return { ...state, phases: state.phases.filter((item) => item.id !== id) };
                  }
                  if (type === 'milestone') {
                    return { ...state, milestones: state.milestones.filter((item) => item.id !== id) };
                  }
                  return { ...state, deliverables: state.deliverables.filter((item) => item.id !== id) };
                });
                },
                { allowWhileTimelineDraft: true },
              )}
            />
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableList
            title="Status"
            items={activeReport.state.statusItems}
            onAddItem={guardManage(statusListManager.addItem)}
            onDeleteItem={guardManage(statusListManager.deleteItem)}
            onUpdateItem={guardManage(statusListManager.updateItem)}
            onReorderItems={guardManage(statusListManager.reorderItems)}
          />
          <EditableList
            title="Udfordringer"
            items={activeReport.state.challengeItems}
            onAddItem={guardManage(challengeListManager.addItem)}
            onDeleteItem={guardManage(challengeListManager.deleteItem)}
            onUpdateItem={guardManage(challengeListManager.updateItem)}
            onReorderItems={guardManage(challengeListManager.reorderItems)}
          />
        </div>
        <div className="lg:col-span-2">
          <MainStatusTable
            rows={activeReport.state.mainTableRows}
            cycleStatus={guardManage(restActions.cycleStatus)}
            updateNote={guardManage(restActions.updateMainTableRowNote)}
          />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <DeliverablesList
              deliverables={activeReport.state.deliverables}
              calculateDateFromPosition={timelineManager.calculateDateFromPosition}
            />
          </div>
          <div className="md:col-span-2">
            <RiskMatrix
              risks={activeReport.state.risks}
              updateRiskPosition={guardManage(riskManager.updatePosition)}
              addRisk={guardManage(riskManager.add)}
              updateRiskName={guardManage(riskManager.updateName)}
              deleteRisk={guardManage(riskManager.delete)}
            />
          </div>
        </div>
      </main>
      {isNewReportModalOpen && (
        <NewReportModal
          manager={reportsManager}
          onClose={() => setIsNewReportModalOpen(false)}
          onSelect={(key) => {
            reportsManager.create(key, true);
            setActiveWeekKey(key);
            setIsNewReportModalOpen(false);
          }}
        />
      )}
        </div>
      </div>
    </>
  );
};

type NewReportModalProps = {
  manager: {
    getAvailableWeeks: () => string[];
    create: (weekKey: string, copyLatest: boolean) => void;
    createNext: () => string | null;
    delete: (weekKey: string) => void;
  };
  onClose: () => void;
  onSelect: (weekKey: string) => void;
};

const NewReportModal = ({ manager, onClose, onSelect }: NewReportModalProps) => {
  const availableWeeks = manager.getAvailableWeeks();
  const [selectedWeek, setSelectedWeek] = useState<string>(availableWeeks[0] || '');

  useEffect(() => {
    if (!selectedWeek || !availableWeeks.includes(selectedWeek)) {
      setSelectedWeek(availableWeeks[0] ?? '');
    }
  }, [availableWeeks, selectedWeek]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 export-hide">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h3 className="text-xl font-bold mb-4 text-slate-800">Opret ny ugerapport</h3>
        <label htmlFor="week-select" className="block text-sm font-medium text-slate-700 mb-2">
          Vælg uge for rapporten (baseres på seneste)
        </label>
        {availableWeeks.length > 0 ? (
          <select
            id="week-select"
            value={selectedWeek}
            onChange={(event) => setSelectedWeek(event.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md p-2 text-sm"
          >
            {availableWeeks.map((week) => (
              <option key={week} value={week}>
                {week}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-slate-500 p-3 bg-slate-100 rounded-md">
            Der er ingen flere ledige uger i projektperioden.
          </p>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="bg-slate-200 text-slate-800 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-300">
            Annuller
          </button>
          <button
            onClick={() => onSelect(selectedWeek)}
            disabled={!selectedWeek}
            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-700 disabled:bg-slate-300"
          >
            Opret
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectReportsPage;
