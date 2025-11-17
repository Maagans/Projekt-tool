import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KanbanBoard } from '../../../components/KanbanBoard';
import { Timeline } from '../../../components/Timeline';
import { EditableList } from '../../../components/RichTextEditor';
import { MainStatusTable } from '../../../components/MainStatusTable';
import { RiskMatrix } from '../../../components/RiskMatrix';
import { ProjectRiskMatrix, PROJECT_RISK_CATEGORY_META } from '../../../components/ProjectRiskMatrix';
import { CalendarIcon, ChevronDownIcon, PlusIcon, StepForwardIcon, TrashIcon } from '../../../components/Icons';
import { SyncStatusPill } from '../../../components/SyncStatusPill';
import { ProjectReportHeader } from '../../../components/ProjectReportHeader';
import { KanbanTaskInspector } from '../../../components/KanbanTaskInspector';
import { KanbanTaskList } from '../../../components/KanbanTaskList';
import type {
  Deliverable,
  Milestone,
  Phase,
  ProjectRisk,
  ProjectRiskCategoryKey,
  ProjectRiskCategoryMeta,
  ProjectRiskStatus,
  ProjectState,
  Report,
  Risk,
} from '../../../types';
import { generateId, TimelineItemType, TimelineUpdatePayload } from '../../../hooks/projectManager/utils';
import { useProjectRisks as useCuratedProjectRisks } from '../../../hooks/useProjectRisks';
import { api } from '../../../api';
import { useProjectRouteContext } from './ProjectLayout';
import { PROJECT_RISK_ANALYSIS_ENABLED } from '../../constants';

const DEFAULT_PHASE_WIDTH = 10;

const formatWeekLabel = (weekKey: string, variant: 'full' | 'short' = 'full'): string => {
  const match = weekKey.match(/W(\d{1,2})$/);
  if (!match) return weekKey;
  const week = match[1].padStart(2, '0');
  if (variant === 'short') {
    return `U${week}`;
  }
  return `Uge ${week}`;
};

const normalizeCategoryKey = (key: ProjectRiskCategoryKey | string | undefined): ProjectRiskCategoryKey => {
  if (typeof key === 'string' && key in PROJECT_RISK_CATEGORY_META) {
    return key as ProjectRiskCategoryKey;
  }
  return 'other';
};

const getCategoryMeta = (key: ProjectRiskCategoryKey | string | undefined): ProjectRiskCategoryMeta => {
  const normalized = normalizeCategoryKey(key);
  const definition = PROJECT_RISK_CATEGORY_META[normalized] ?? PROJECT_RISK_CATEGORY_META.other;
  return {
    key: normalized,
    label: definition.label,
    badge: definition.badge,
    description: definition.description,
  };
};

export const snapshotToProjectRisk = (risk: Risk, projectId: string): ProjectRisk => {
  const meta = getCategoryMeta(risk.categoryKey);
  return {
    id: risk.id,
    projectId,
    projectRiskId: risk.projectRiskId ?? null,
    title: risk.name,
    description: risk.description ?? null,
    probability: risk.s,
    impact: risk.k,
    score: risk.s * risk.k,
    category: meta,
    status: (risk.status as ProjectRiskStatus) ?? 'open',
    owner: risk.ownerName
      ? { id: risk.projectRiskId ?? risk.id, name: risk.ownerName, email: risk.ownerEmail ?? null }
      : null,
    mitigationPlanA: risk.mitigationPlanA ?? null,
    mitigationPlanB: risk.mitigationPlanB ?? null,
    followUpNotes: risk.followUpNotes ?? null,
    followUpFrequency: risk.followUpFrequency ?? null,
    dueDate: risk.dueDate ?? null,
    lastFollowUpAt: risk.lastFollowUpAt ?? null,
    isArchived: Boolean(risk.projectRiskArchived),
    projectRiskUpdatedAt: risk.projectRiskUpdatedAt ?? null,
    createdBy: null,
    updatedBy: null,
    createdAt: risk.lastFollowUpAt ?? new Date().toISOString(),
    updatedAt: risk.projectRiskUpdatedAt ?? new Date().toISOString(),
  };
};

export const projectRiskToReportState = (risk: ProjectRisk): Risk => ({
  id: risk.id,
  name: risk.title,
  s: risk.probability,
  k: risk.impact,
  projectRiskId: risk.projectRiskId ?? risk.id,
  description: risk.description ?? null,
  status: risk.status,
  categoryKey: risk.category?.key ?? 'other',
  ownerName: risk.owner?.name ?? null,
  ownerEmail: risk.owner?.email ?? null,
  mitigationPlanA: risk.mitigationPlanA ?? null,
  mitigationPlanB: risk.mitigationPlanB ?? null,
  followUpNotes: risk.followUpNotes ?? null,
  followUpFrequency: risk.followUpFrequency ?? null,
  dueDate: risk.dueDate ?? null,
  lastFollowUpAt: risk.lastFollowUpAt ?? null,
  projectRiskArchived: Boolean(risk.isArchived),
  projectRiskUpdatedAt: risk.projectRiskUpdatedAt ?? null,
});

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
  const [isRiskSelectorOpen, setIsRiskSelectorOpen] = useState(false);
  const [selectedReportRiskIds, setSelectedReportRiskIds] = useState<string[]>([]);
  const [selectorError, setSelectorError] = useState<string | null>(null);
  const [selectedSnapshotRiskId, setSelectedSnapshotRiskId] = useState<string | null>(null);
  const [riskMatrixError, setRiskMatrixError] = useState<string | null>(null);

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
  const snapshotProjectRisks = useMemo<ProjectRisk[]>(
    () => {
      if (!PROJECT_RISK_ANALYSIS_ENABLED) {
        return [];
      }
      return (activeReport?.state.risks ?? [])
        .filter((risk) => Boolean(risk.projectRiskId))
        .map((risk) => snapshotToProjectRisk(risk, project.id));
    },
    [activeReport?.state.risks, project.id],
  );
  const selectedSnapshotRisk = useMemo(
    () => snapshotProjectRisks.find((risk) => risk.id === selectedSnapshotRiskId) ?? null,
    [snapshotProjectRisks, selectedSnapshotRiskId],
  );
  useEffect(() => {
    if (!PROJECT_RISK_ANALYSIS_ENABLED) {
      setSelectedSnapshotRiskId(null);
      return;
    }
    setSelectedSnapshotRiskId((current) => {
      if (snapshotProjectRisks.length === 0) {
        return null;
      }
      if (current && snapshotProjectRisks.some((risk) => risk.id === current)) {
        return current;
      }
      return snapshotProjectRisks[0]?.id ?? null;
    });
  }, [snapshotProjectRisks]);
  const handleSelectSnapshotRisk = useCallback((riskId: string) => {
    setSelectedSnapshotRiskId((current) => (current === riskId ? null : riskId));
  }, []);
  const { canManage } = projectManager;
  const curatedRisksQuery = useCuratedProjectRisks(PROJECT_RISK_ANALYSIS_ENABLED ? project.id : null);
  const curatedRisks: ProjectRisk[] = curatedRisksQuery.risks ?? [];
  const curatedRisksQueryState = curatedRisksQuery.query;
  const floatingSyncClass = 'fixed bottom-6 right-4 sm:right-6 pointer-events-none z-40 drop-shadow-lg';
  const isTimelineDraftActive = isTimelineDirty && dirtyWeekKeyRef.current === activeWeekKey;
  const resetTimelineDraft = useCallback(() => {
    pendingTimelineStateRef.current = null;
    dirtyWeekKeyRef.current = null;
    setIsTimelineDirty(false);
  }, []);

  useEffect(() => {
    if (!PROJECT_RISK_ANALYSIS_ENABLED) {
      return;
    }
    const currentIds =
      activeReport?.state.risks
        ?.map((risk) => risk.projectRiskId)
        .filter((value): value is string => Boolean(value)) ?? [];
    setSelectedReportRiskIds(currentIds);
  }, [activeReport?.state.risks]);

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

  const toggleReportRiskSelection = useCallback((riskId: string) => {
    setSelectedReportRiskIds((prev) =>
      prev.includes(riskId) ? prev.filter((id) => id !== riskId) : [...prev, riskId],
    );
  }, []);

  const actions = projectManager.projectActions(project.id, activeWeekKey);
  const reportsManager = actions?.reportsManager ?? null;
  const restActions = actions
    ? (({ reportsManager: _reportsManager, ...rest }) => rest)(actions)
    : null;

  const attachRisksMutation = useMutation({
    mutationFn: async (riskIds: string[]) => {
      if (!activeReport?.id) {
        throw new Error('Rapporten er ikke gemt endnu.');
      }
      return api.attachReportRisks(activeReport.id, riskIds);
    },
    onSuccess: (snapshots) => {
      if (!reportsManager || !activeReport) {
        return;
      }
      const normalizedSnapshots = snapshots.map(
        (snapshot): ProjectRisk => ({
          ...snapshot,
          projectId: project.id,
          category: getCategoryMeta(snapshot.category?.key),
        }),
      );
      reportsManager.replaceState({
        ...activeReport.state,
        risks: normalizedSnapshots.map(projectRiskToReportState),
      });
      setSelectedReportRiskIds(normalizedSnapshots.map((snapshot) => snapshot.projectRiskId ?? snapshot.id));
      setSelectedSnapshotRiskId((current) => {
        if (current && normalizedSnapshots.some((snapshot) => snapshot.id === current)) {
          return current;
        }
        return normalizedSnapshots[0]?.id ?? null;
      });
      setSelectorError(null);
      setIsRiskSelectorOpen(false);
    },
    onError: (error) => {
      setSelectorError(error instanceof Error ? error.message : 'Kunne ikke opdatere rapportens risici.');
    },
  });

  const updateReportSnapshotMutation = useMutation({
    mutationFn: ({
      reportId,
      snapshotId,
      probability,
      impact,
    }: {
      reportId: string;
      snapshotId: string;
      probability: number;
      impact: number;
    }) => api.updateReportRiskSnapshot(reportId, snapshotId, { probability, impact }),
  });

  const handleCreateNext = () => {
    if (isBusy || !reportsManager) return;
    if (!confirmDiscardTimelineChanges()) return;
    const newKey = reportsManager.createNext();
    if (newKey) setActiveWeekKey(newKey);
  };

  const handleDeleteReport = (weekKey: string) => {
    if (isBusy || !reportsManager) return;
    if (!confirmDiscardTimelineChanges()) return;
    reportsManager.delete(weekKey);
    const remainingReports = project.reports.filter((report) => report.weekKey !== weekKey);
    if (remainingReports.length > 0) {
      setActiveWeekKey(remainingReports.sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0].weekKey);
    } else {
      setActiveWeekKey(null);
    }
  };

  if (!reportsManager || !restActions) {
    return null;
  }

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

  const { timelineManager, statusListManager, challengeListManager, nextStepListManager, kanbanManager, riskManager } =
    restActions;
  const legacyRiskMove = guardManage(riskManager.updatePosition);
  const handleSnapshotMove = guardManage(
    (riskId: string, probability: number, impact: number) => {
      if (!PROJECT_RISK_ANALYSIS_ENABLED) {
        return;
      }
      if (!reportsManager || !activeReport) {
        return;
      }
      if (!activeReport.id) {
        setRiskMatrixError('Gem rapporten før du opdaterer risici.');
        return;
      }
      const previousRisks = activeReport.state.risks ?? [];
      const previousRisk = previousRisks.find((risk) => risk.id === riskId);
      if (!previousRisk) {
        return;
      }
      const optimisticRisks = previousRisks.map((risk) =>
        risk.id === riskId ? { ...risk, s: probability, k: impact } : risk,
      );
      reportsManager.replaceState({ ...activeReport.state, risks: optimisticRisks });
      setRiskMatrixError(null);
      (async () => {
        try {
          await updateReportSnapshotMutation.mutateAsync({
            reportId: activeReport.id!,
            snapshotId: riskId,
            probability,
            impact,
          });
        } catch (error) {
          const revertedRisks = previousRisks.map((risk) =>
            risk.id === riskId ? { ...risk, s: previousRisk.s, k: previousRisk.k } : risk,
          );
          reportsManager.replaceState({ ...activeReport.state, risks: revertedRisks });
          setRiskMatrixError(error instanceof Error ? error.message : 'Kunne ikke opdatere risikomatrix.');
        }
      })();
    },
    { allowWhileTimelineDraft: true },
  );

  const kanbanTasks = useMemo(
    () =>
      (activeReport.state.kanbanTasks ?? []).map((task) => ({
        ...task,
        createdAt: task.createdAt ?? new Date().toISOString(),
      })),
    [activeReport.state.kanbanTasks],
  );
  const reportStats = {
    risks: activeReport.state.risks?.length ?? 0,
    phases: activeReport.state.phases?.length ?? 0,
    milestones: activeReport.state.milestones?.length ?? 0,
    deliverables: activeReport.state.deliverables?.length ?? 0,
    tasks: kanbanTasks.length,
  };
  const addTask = guardManage(kanbanManager.add);
  const updateTask = guardManage(kanbanManager.updateContent);
  const deleteTask = guardManage(kanbanManager.delete);
  const moveTask = guardManage(kanbanManager.updateStatus);
  const updateTaskDetails = guardManage(kanbanManager.updateDetails);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskList, setShowTaskList] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const currentWeekLabel = useMemo(() => {
    if (!activeWeekKey) return null;
    return formatWeekLabel(activeWeekKey);
  }, [activeWeekKey]);
  const selectedTask = useMemo(
    () => kanbanTasks.find((task) => task.id === selectedTaskId) ?? null,
    [kanbanTasks, selectedTaskId],
  );
  useEffect(() => {
    if (selectedTaskId && !selectedTask) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, selectedTask]);

  return (
    <>
      {isBusy && <SyncStatusPill message="Synkroniserer rapportændringer..." className={floatingSyncClass} />}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <aside
            className={`w-full flex-shrink-0 rounded-lg bg-white shadow-sm flex flex-col export-hide self-stretch transition-all duration-200 ${
              isHistoryCollapsed ? 'lg:w-20 items-center p-3' : 'lg:w-64 p-4'
            }`}
          >
            <div
              className={`flex w-full items-center ${
                isHistoryCollapsed ? 'justify-center' : 'justify-between'
              } ${isHistoryCollapsed ? 'mb-0' : 'mb-3'}`}
            >
              {!isHistoryCollapsed && <h3 className="text-lg font-bold text-slate-700">Rapporter</h3>}
              <button
                type="button"
                onClick={() => setIsHistoryCollapsed((prev) => !prev)}
                className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                aria-expanded={!isHistoryCollapsed}
                aria-label={isHistoryCollapsed ? 'Udvid rapporthistorik' : 'Skjul rapporthistorik'}
              >
                <span className={`inline-flex transition-transform ${isHistoryCollapsed ? 'rotate-90' : '-rotate-90'}`}>
                  <ChevronDownIcon />
                </span>
              </button>
            </div>
            {isHistoryCollapsed ? (
              <div className="mt-2 flex w-full flex-col items-center gap-3 text-center">
                <div className="rounded-full border border-slate-200 p-2 text-slate-500">
                  <CalendarIcon />
                </div>
                {currentWeekLabel && (
                  <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                    {currentWeekLabel}
                  </span>
                )}
                <div className="flex-1 w-full overflow-y-auto pt-1">
                  <ul className="flex flex-col items-center gap-2">
                    {project.reports.map((report) => (
                      <li key={report.weekKey}>
                        <button
                          onClick={() => {
                            if (!confirmDiscardTimelineChanges()) return;
                            setActiveWeekKey(report.weekKey);
                          }}
                          className={`flex h-10 w-12 items-center justify-center rounded-xl border text-xs font-semibold ${
                            report.weekKey === activeWeekKey
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                          title={`Åbn rapport for ${formatWeekLabel(report.weekKey)}`}
                        >
                          {formatWeekLabel(report.weekKey, 'short')}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {canManage && (
                  <div className="mb-4 flex items-center gap-2">
                    <button
                      onClick={() => setIsNewReportModalOpen(true)}
                      disabled={isBusy}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-md p-2 text-sm font-semibold transition-colors ${
                        isBusy
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      }`}
                      title="Opret ny specifik ugerapport"
                    >
                      <PlusIcon /> Ny
                    </button>
                    <button
                      onClick={handleCreateNext}
                      disabled={isBusy}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-md p-2 text-sm font-semibold transition-colors ${
                        isBusy
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
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
                          className={`flex items-center gap-3 rounded-md p-2 text-left text-sm font-medium ${
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
                              isBusy ? 'cursor-not-allowed text-slate-300' : 'text-slate-400 hover:text-red-500'
                            } opacity-0 transition-opacity group-hover:opacity-100`}
                            title="Slet rapport"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </aside>
      <main id="report-content" className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 w-full">
        <div className="lg:col-span-2">
          <ProjectReportHeader
            projectName={project.config.projectName}
            projectStatus={project.status}
            projectStartDate={project.config.projectStartDate}
            projectEndDate={project.config.projectEndDate}
            reportWeekKey={activeReport.weekKey}
            isTimelineDirty={isTimelineDraftActive}
            stats={reportStats}
          />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-3">
          <EditableList
            title="Status (Resumé)"
            items={activeReport.state.statusItems}
            colorScheme="green"
            onAddItem={guardManage(statusListManager.addItem)}
            onDeleteItem={guardManage(statusListManager.deleteItem)}
            onUpdateItem={guardManage(statusListManager.updateItem)}
            onReorderItems={guardManage(statusListManager.reorderItems)}
          />
          <EditableList
            title="Udfordringer"
            items={activeReport.state.challengeItems}
            colorScheme="red"
            onAddItem={guardManage(challengeListManager.addItem)}
            onDeleteItem={guardManage(challengeListManager.deleteItem)}
            onUpdateItem={guardManage(challengeListManager.updateItem)}
            onReorderItems={guardManage(challengeListManager.reorderItems)}
          />
          <EditableList
            title="Næste skridt"
            items={activeReport.state.nextStepItems ?? []}
            colorScheme="blue"
            onAddItem={guardManage(nextStepListManager.addItem)}
            onDeleteItem={guardManage(nextStepListManager.deleteItem)}
            onUpdateItem={guardManage(nextStepListManager.updateItem)}
            onReorderItems={guardManage(nextStepListManager.reorderItems)}
          />
        </div>
        <div className="lg:col-span-2">
          <MainStatusTable
            rows={activeReport.state.mainTableRows}
            cycleStatus={guardManage(restActions.cycleStatus)}
            updateNote={guardManage(restActions.updateMainTableRowNote)}
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
        <div className="lg:col-span-2">
          <KanbanBoard
            tasks={kanbanTasks}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onMoveTask={moveTask}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
            headerActions={
              <button
                type="button"
                onClick={() => setShowTaskList((prev) => !prev)}
                className="self-start rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                {showTaskList ? 'Skjul opgaveliste' : 'Vis opgaveliste'}
              </button>
            }
          />
        </div>
        {showTaskList && (
          <div className="lg:col-span-2">
            <KanbanTaskList tasks={kanbanTasks} onSelectTask={(task) => setSelectedTaskId(task.id)} />
          </div>
        )}
        <div className="lg:col-span-2">
          <KanbanTaskInspector
            task={selectedTask}
            disabled={!canEdit}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={(id, updates) => updateTaskDetails(id, updates)}
          />
        </div>
        {PROJECT_RISK_ANALYSIS_ENABLED ? (
          <>
            <div className="lg:col-span-2">
              {canManage && (
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    disabled={!activeReport?.id}
                    onClick={() => {
                      setSelectorError(null);
                      setIsRiskSelectorOpen(true);
                    }}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Synkroniser risici
                  </button>
                </div>
              )}
              <div className="space-y-4">
                  <ProjectRiskMatrix
                    risks={snapshotProjectRisks}
                    selectedRiskId={selectedSnapshotRiskId}
                    onSelectRisk={handleSelectSnapshotRisk}
                    onMoveRisk={PROJECT_RISK_ANALYSIS_ENABLED ? handleSnapshotMove : legacyRiskMove}
                    disabled={!canManage}
                  />
                  {riskMatrixError && (
                    <p className="text-sm text-red-600">{riskMatrixError}</p>
                  )}
                <SnapshotRiskDetailsPanel
                  risk={selectedSnapshotRisk}
                  totalRisks={snapshotProjectRisks.length}
                  weekKey={activeReport.weekKey}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="lg:col-span-2">
            <RiskMatrix
              risks={activeReport.state.risks}
              updateRiskPosition={guardManage(riskManager.updatePosition)}
              addRisk={guardManage(riskManager.add)}
              updateRiskName={guardManage(riskManager.updateName)}
              deleteRisk={guardManage(riskManager.delete)}
            />
          </div>
        )}
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
      {PROJECT_RISK_ANALYSIS_ENABLED && isRiskSelectorOpen && (
        <div className="fixed inset-0 z-40 flex bg-black/30">
          <div className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Synkroniser risici</h3>
                <p className="text-sm text-slate-600">
                  Vælg hvilke kuraterede risici der skal vises i denne rapport.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRiskSelectorOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Luk
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              {curatedRisksQueryState.isLoading ? (
                <p className="text-sm text-slate-500">Indlæser risici …</p>
              ) : curatedRisks.length === 0 ? (
                <p className="text-sm text-slate-500">Ingen kuraterede risici tilføjet endnu.</p>
              ) : (
                <div className="space-y-3">
                  {curatedRisks.map((risk) => {
                    const meta = risk.category ?? getCategoryMeta('other');
                    const isChecked = selectedReportRiskIds.includes(risk.id);
                    return (
                      <label
                        key={risk.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                          isChecked ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={isChecked}
                          onChange={() => toggleReportRiskSelection(risk.id)}
                        />
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">{risk.title}</span>
                            {risk.isArchived && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                Arkiveret
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span>S {risk.probability}</span>
                            <span>K {risk.impact}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                              {meta.label}
                            </span>
                            {risk.owner?.name && <span>Ansvarlig: {risk.owner.name}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectorError && (
                <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{selectorError}</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsRiskSelectorOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuller
              </button>
              <button
                type="button"
                disabled={!activeReport?.id || attachRisksMutation.isPending}
                onClick={() => attachRisksMutation.mutate([...selectedReportRiskIds])}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Gem risici
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
};

type SnapshotRiskDetailsPanelProps = {
  risk: ProjectRisk | null;
  totalRisks: number;
  weekKey: string | null;
};

const SNAPSHOT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const SNAPSHOT_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...SNAPSHOT_DATE_OPTIONS,
  hour: '2-digit',
  minute: '2-digit',
};

const formatSnapshotDate = (
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('da-DK', options).format(date);
};

const textOrPlaceholder = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value : 'Ikke angivet';

const SnapshotRiskDetailsPanel = ({ risk, totalRisks, weekKey }: SnapshotRiskDetailsPanelProps) => {
  if (totalRisks === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Ingen risici er synkroniseret til rapporten endnu. Brug knappen &quot;Synkroniser risici&quot; for at vælge kuraterede
        risici fra fanen Risikovurdering.
      </section>
    );
  }

  if (!risk) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Vælg en risiko i matrixen for at se detaljer og justere point for denne rapport. Snapshotdata viser den præcise
        beskrivelse, planer og opfølgning for ugevalget.
      </section>
    );
  }

  const archivedLabel = risk.isArchived
    ? `Arkiveret siden ${
        formatSnapshotDate(risk.projectRiskUpdatedAt, SNAPSHOT_DATE_OPTIONS) ?? ''
      }`.trim()
    : null;

  const scoreLabel = `Score ${risk.score} (S ${risk.probability} / K ${risk.impact})`;
  const dueDate = formatSnapshotDate(risk.dueDate, SNAPSHOT_DATE_OPTIONS) ?? 'Ikke angivet';
  const lastFollowUp =
    formatSnapshotDate(risk.lastFollowUpAt, SNAPSHOT_DATE_TIME_OPTIONS) ?? 'Ikke angivet';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">Detaljer for valgte risiko</h4>
          <p className="text-sm text-slate-600">
            {weekKey ? `Snapshot for ${weekKey}` : 'Snapshot baseret på denne rapport.'}
          </p>
        </div>
        {archivedLabel && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            {archivedLabel}
          </span>
        )}
      </div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score</dt>
          <dd className="mt-1 text-sm text-slate-900">{scoreLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
          <dd className="mt-1 text-sm capitalize text-slate-900">{risk.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</dt>
          <dd className="mt-1">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${risk.category.badge}`}
            >
              {risk.category.label}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ansvarlig</dt>
          <dd className="mt-1 text-sm text-slate-900">
            {risk.owner?.name ?? 'Ikke angivet'}
            {risk.owner?.email && <span className="block text-xs text-slate-500">{risk.owner.email}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opfølgning</dt>
          <dd className="mt-1 text-sm text-slate-900">{textOrPlaceholder(risk.followUpFrequency)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sidst fulgt op</dt>
          <dd className="mt-1 text-sm text-slate-900">{lastFollowUp}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Forfaldsdato</dt>
          <dd className="mt-1 text-sm text-slate-900">{dueDate}</dd>
        </div>
      </dl>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-100 p-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Beskrivelse</h5>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {textOrPlaceholder(risk.description)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 p-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Opfølgningsnoter
          </h5>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {textOrPlaceholder(risk.followUpNotes)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 p-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan A</h5>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {textOrPlaceholder(risk.mitigationPlanA)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 p-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan B</h5>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {textOrPlaceholder(risk.mitigationPlanB)}
          </p>
        </div>
      </div>
    </section>
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















