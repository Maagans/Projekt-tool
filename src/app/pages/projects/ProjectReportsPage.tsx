import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Deliverable,
  KanbanTask,
  MainTableRow,
  Milestone,
  Phase,
  ProjectRisk,
  ProjectRiskCategoryKey,
  ProjectRiskCategoryMeta,
  ProjectRiskStatus,
  ProjectState,
  Risk,
  Workstream,
} from '../../../types';
import { cloneStateWithNewIds, generateId, getInitialProjectState, getWeekKey } from '../../../hooks/projectManager/utils';
import { useProjectRisks as useCuratedProjectRisks } from '../../../hooks/useProjectRisks';
import { api } from '../../../api';
import { useProjectRouteContext } from './ProjectLayout';
import { PROJECT_RISK_ANALYSIS_ENABLED } from '../../constants';
import { reportApi } from '../../../api/report';
import { planApi } from '../../../api/plan';
import { reportKeys, useProjectReports, useReportDetail, useReportKanban, useReportRiskMatrix, useReportStatusCards } from '../../../hooks/useReports';
import type { ReportSummary } from '../../../api/report';


const parseDateOnlyToUtcDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number.parseInt(yearStr ?? '', 10);
  const month = Number.parseInt(monthStr ?? '', 10);
  const day = Number.parseInt(dayStr ?? '', 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const buildTimelineHelpers = (projectStartDate?: string | null, projectEndDate?: string | null) => {
  const toUtcTimestamp = (value?: string | null): number | null => {
    const date = parseDateOnlyToUtcDate(value);
    return date ? date.getTime() : null;
  };

  return {
    calculateDateFromPosition: (position: number) => {
      const start = toUtcTimestamp(projectStartDate);
      const end = toUtcTimestamp(projectEndDate);
      if (start === null || end === null || end <= start) {
        return '';
      }
      const date = new Date(start + ((end - start) * clampPercentage(position)) / 100);
      return date.toISOString().split('T')[0] ?? '';
    },
    calculatePositionFromDate: (date: string) => {
      const start = toUtcTimestamp(projectStartDate);
      const end = toUtcTimestamp(projectEndDate);
      const target = toUtcTimestamp(date);
      if (start === null || end === null || target === null || end <= start) {
        return 0;
      }
      return clampPercentage(((target - start) / (end - start)) * 100);
    },
    getTodayPosition: () => {
      const start = toUtcTimestamp(projectStartDate);
      const end = toUtcTimestamp(projectEndDate);
      if (start === null || end === null || end <= start) {
        return null;
      }
      const now = new Date();
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      if (todayUtc < start || todayUtc > end) {
        return null;
      }
      return ((todayUtc - start) / (end - start)) * 100;
    },
    getMonthMarkers: () => {
      const startDate = parseDateOnlyToUtcDate(projectStartDate);
      const endDate = parseDateOnlyToUtcDate(projectEndDate);
      if (!startDate || !endDate || endDate <= startDate) {
        return [];
      }
      const startMs = startDate.getTime();
      const endMs = endDate.getTime();
      const markers: { position: number; label: string }[] = [];
      const current = new Date(startDate);
      current.setUTCDate(1);
      while (current.getTime() <= endMs) {
        const position = ((current.getTime() - startMs) / (endMs - startMs)) * 100;
        if (position >= 0 && position <= 100) {
          markers.push({
            position,
            label: current.toLocaleString('da-DK', { month: 'short', year: '2-digit' }),
          });
        }
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
      return markers;
    },
  };
};

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

const pickLatestReportId = (reports: ReportSummary[]): string | null => {
  if (reports.length === 0) return null;
  return [...reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0].id!;
};

const enumerateWeeks = (startDate?: string | null, endDate?: string | null): string[] => {
  const start = parseDateOnlyToUtcDate(startDate);
  const end = parseDateOnlyToUtcDate(endDate);
  if (!start || !end || start > end) {
    return [];
  }
  const weeks = new Set<string>();
  const current = new Date(start);
  while (current.getTime() <= end.getTime()) {
    weeks.add(getWeekKey(new Date(current)));
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return Array.from(weeks);
};

const getAvailableWeeks = (projectStartDate?: string | null, projectEndDate?: string | null, existingWeeks: string[] = []) =>
  enumerateWeeks(projectStartDate, projectEndDate)
    .filter((week) => !existingWeeks.includes(week))
    .sort()
    .reverse();

const parseWeekKeyToDate = (weekKey: string): Date | null => {
  const match = weekKey.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week)) return null;
  // ISO week: week 1 is the week with the first Thursday of the year.
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7; // 1..7
  // Move to Monday
  const isoStart = new Date(simple);
  isoStart.setUTCDate(simple.getUTCDate() - (dayOfWeek - 1));
  return isoStart;
};

const addWeeks = (date: Date, weeks: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
};

const findNextWeekKey = (reports: ReportSummary[], projectEndDate?: string | null): string | null => {
  if (!reports.length) return null;
  const latestWeek = [...reports].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0].weekKey;
  const latestWeekStart = parseWeekKeyToDate(latestWeek);
  if (!latestWeekStart) return null;
  const nextDate = addWeeks(latestWeekStart, 1);
  const endDate = parseDateOnlyToUtcDate(projectEndDate);
  if (endDate && nextDate > endDate) {
    return null;
  }
  return getWeekKey(nextDate);
};

const cloneReportStateForCreate = (baseState?: ProjectState, workstreams?: Workstream[]): ProjectState => {
  const seeded = baseState ?? getInitialProjectState();
  const canonicalStreams =
    workstreams && workstreams.length > 0
      ? workstreams.map((stream, index) => ({
          id: stream.id ?? generateId(),
          name: stream.name ?? `Workstream ${index + 1}`,
          order: typeof stream.order === 'number' ? stream.order : index,
        }))
      : seeded.workstreams ?? [];
  return cloneStateWithNewIds({ ...seeded, workstreams: canonicalStreams });
};

const buildReportStateFromPlan = (plan: Awaited<ReturnType<typeof planApi.getSnapshot>>, project: Project) => {
  const idMap = new Map<string, string>();
  const remap = (id?: string | null) => {
    if (!id) return generateId();
    if (!idMap.has(id)) idMap.set(id, generateId());
    return idMap.get(id)!;
  };

  const phases =
    plan.phases?.map((p) => ({
      id: remap(p.id),
      text: p.label,
      start: p.startPercentage ?? 0,
      end: p.endPercentage ?? 0,
      highlight: p.highlight ?? '',
      workstreamId: p.workstreamId ?? null,
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
      status: p.status ?? null,
    })) ?? [];

  const milestones =
    plan.milestones?.map((m, idx) => ({
      id: remap(m.id),
      text: m.label,
      position: m.position ?? idx,
      workstreamId: m.workstreamId ?? null,
      date: m.dueDate ?? null,
      status: m.status ?? null,
    })) ?? [];

  const milestoneLookup = new Map<string, string>();
  plan.milestones?.forEach((m) => milestoneLookup.set(m.id, remap(m.id)));

  const deliverables =
    plan.deliverables?.map((d, idx) => ({
      id: remap(d.id),
      text: d.label,
      position: d.position ?? idx,
      milestoneId: d.milestoneId ? milestoneLookup.get(d.milestoneId) ?? null : null,
      status: d.status ?? null,
      owner: d.ownerName ?? null,
      ownerId: d.ownerEmployeeId ?? null,
      description: d.description ?? null,
      notes: d.notes ?? null,
      startDate: d.startDate ?? null,
      endDate: d.endDate ?? null,
      progress: d.progress ?? null,
      checklist: (d.checklist ?? []).map((i, iIdx) => ({
        id: remap(i.id),
        text: i.text ?? '',
        completed: !!i.completed,
        position: iIdx,
      })),
    })) ?? [];

  return {
    ...getInitialProjectState(),
    phases,
    milestones,
    deliverables,
    workstreams: project.workstreams ?? [],
  } satisfies ProjectState;
};

type WeekSelectorProps = {
  reports: ReportSummary[];
  activeReportId: string | null;
  onSelect: (reportId: string) => void;
  onCreateWeek: () => void;
  onCreateNext: () => void;
  onDelete: (reportId: string) => void;
  disabled: boolean;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
};

const ReportWeekSelector = ({
  reports,
  activeReportId,
  onSelect,
  onCreateWeek,
  onCreateNext,
  onDelete,
  disabled,
  collapsed,
  setCollapsed,
}: WeekSelectorProps) => {
  const currentWeekLabel = useMemo(() => {
    const current = reports.find((report) => report.id === activeReportId);
    return current ? formatWeekLabel(current.weekKey) : null;
  }, [activeReportId, reports]);

  return (
    <aside
      className={`w-full flex-shrink-0 rounded-lg bg-white shadow-sm flex flex-col export-hide self-stretch transition-all duration-200 ${
        collapsed ? 'lg:w-20 items-center p-3' : 'lg:w-64 p-4'
      }`}
    >
      <div className={`flex w-full items-center ${collapsed ? 'justify-center' : 'justify-between'} ${collapsed ? 'mb-0' : 'mb-3'}`}>
        {!collapsed && <h3 className="text-lg font-bold text-slate-700">Rapporter</h3>}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Udvid rapporthistorik' : 'Skjul rapporthistorik'}
        >
          <span className={`inline-flex transition-transform ${collapsed ? 'rotate-90' : '-rotate-90'}`}>
            <ChevronDownIcon />
          </span>
        </button>
      </div>
      {collapsed ? (
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
              {reports.map((report) => (
                <li key={report.id}>
                  <button
                    onClick={() => onSelect(report.id!)}
                    className={`flex h-10 w-12 items-center justify-center rounded-xl border text-xs font-semibold ${
                      report.id === activeReportId
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
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={onCreateWeek}
              disabled={disabled}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md p-2 text-sm font-semibold transition-colors ${
                disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              title="Opret ny specifik ugerapport"
            >
              <PlusIcon /> Ny
            </button>
            <button
              onClick={onCreateNext}
              disabled={disabled}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md p-2 text-sm font-semibold transition-colors ${
                disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
              title="Opret rapport for næste uge"
            >
              <StepForwardIcon /> Næste
            </button>
          </div>
          <div className="flex-grow overflow-y-auto -mr-2 pr-2">
            <ul className="space-y-1">
              {reports.map((report) => (
                <li key={report.id} className="group relative">
                  <button
                    onClick={() => onSelect(report.id!)}
                    className={`flex items-center gap-3 rounded-md p-2 text-left text-sm font-medium ${
                      report.id === activeReportId ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'
                    }`}
                  >
                    <CalendarIcon />
                    {report.weekKey}
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(report.id!);
                    }}
                    disabled={disabled}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${
                      disabled ? 'cursor-not-allowed text-slate-300' : 'text-slate-400 hover:text-red-500'
                    } opacity-0 transition-opacity group-hover:opacity-100`}
                    title="Slet rapport"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </aside>
  );
};

type StatusListsProps = {
  state: ProjectState;
  canEdit: boolean;
  onChange: (payload: Partial<Pick<ProjectState, 'statusItems' | 'challengeItems' | 'nextStepItems' | 'mainTableRows'>>) => void;
  onCycleStatus: (rowId: string) => void;
  onUpdateNote: (rowId: string, note: string) => void;
};

const StatusPanels = ({ state, canEdit, onChange, onCycleStatus, onUpdateNote }: StatusListsProps) => {
  const guard = (fn: (...args: any[]) => void) => (...args: any[]) => {
    if (!canEdit) return;
    fn(...args);
  };

  const hasNarrativeContent =
    (state.statusItems?.length ?? 0) > 0 || (state.challengeItems?.length ?? 0) > 0 || (state.nextStepItems?.length ?? 0) > 0;

  return (
    <>
      <div className="lg:col-span-2">
        {hasNarrativeContent ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <EditableList
              title="Status (Resumé)"
              items={state.statusItems}
              colorScheme="green"
              onAddItem={guard((content: string) => onChange({ statusItems: [...state.statusItems, { id: generateId(), content }] }))}
              onDeleteItem={guard((id: string) => onChange({ statusItems: state.statusItems.filter((item) => item.id !== id) }))}
              onUpdateItem={guard((id: string, content: string) =>
                onChange({ statusItems: state.statusItems.map((item) => (item.id === id ? { ...item, content } : item)) }),
              )}
              onReorderItems={guard((items) => onChange({ statusItems: items }))}
            />
            <EditableList
              title="Udfordringer"
              items={state.challengeItems}
              colorScheme="red"
              onAddItem={guard((content: string) => onChange({ challengeItems: [...state.challengeItems, { id: generateId(), content }] }))}
              onDeleteItem={guard((id: string) => onChange({ challengeItems: state.challengeItems.filter((item) => item.id !== id) }))}
              onUpdateItem={guard((id: string, content: string) =>
                onChange({ challengeItems: state.challengeItems.map((item) => (item.id === id ? { ...item, content } : item)) }),
              )}
              onReorderItems={guard((items) => onChange({ challengeItems: items }))}
            />
            <EditableList
              title="Næste skridt"
              items={state.nextStepItems ?? []}
              colorScheme="blue"
              onAddItem={guard((content: string) => onChange({ nextStepItems: [...(state.nextStepItems ?? []), { id: generateId(), content }] }))}
              onDeleteItem={guard((id: string) =>
                onChange({ nextStepItems: (state.nextStepItems ?? []).filter((item) => item.id !== id) }),
              )}
              onUpdateItem={guard((id: string, content: string) =>
                onChange({
                  nextStepItems: (state.nextStepItems ?? []).map((item) => (item.id === id ? { ...item, content } : item)),
                }),
              )}
              onReorderItems={guard((items) => onChange({ nextStepItems: items }))}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
            Rapporten er tom. Start med at tilføje en status, en udfordring eller et næste skridt.
          </div>
        )}
      </div>
      <div className="lg:col-span-2">
        <MainStatusTable rows={state.mainTableRows} cycleStatus={guard(onCycleStatus)} updateNote={guard(onUpdateNote)} />
      </div>
    </>
  );
};

type TimelinePanelProps = {
  state: ProjectState;
  projectStartDate: string;
  projectEndDate: string;
  helpers: ReturnType<typeof buildTimelineHelpers>;
};

const TimelinePanel = ({ state, projectStartDate, projectEndDate, helpers }: TimelinePanelProps) => (
  <div className="lg:col-span-2">
    <div className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500 mb-2">Tidslinje snapshot (read-only)</div>
      <Timeline
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        phases={state.phases}
        milestones={state.milestones}
        deliverables={state.deliverables}
        calculateDateFromPosition={helpers.calculateDateFromPosition}
        calculatePositionFromDate={helpers.calculatePositionFromDate}
        monthMarkers={helpers.getMonthMarkers()}
        todayPosition={helpers.getTodayPosition()}
        addTimelineItem={() => {}}
        updateTimelineItem={() => {}}
        deleteTimelineItem={() => {}}
        readOnly
      />
    </div>
  </div>
);

type KanbanPanelProps = {
  tasks: KanbanTask[];
  canEdit: boolean;
  onUpdate: (tasks: KanbanTask[]) => void;
};

const KanbanPanel = ({ tasks, canEdit, onUpdate }: KanbanPanelProps) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskList, setShowTaskList] = useState(false);
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId && !selectedTask) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, selectedTask]);

  const updateTaskList = (updater: (list: KanbanTask[]) => KanbanTask[]) => {
    onUpdate(updater(tasks));
  };

  const addTask = (status: KanbanTask['status']) => {
    if (!canEdit) return;
    updateTaskList((prev) => [
      ...prev,
      { id: generateId(), content: 'Ny opgave', status, createdAt: new Date().toISOString() },
    ]);
  };
  const updateTask = (id: string, content: string) => {
    if (!canEdit) return;
    updateTaskList((prev) => prev.map((task) => (task.id === id ? { ...task, content } : task)));
  };
  const deleteTask = (id: string) => {
    if (!canEdit) return;
    updateTaskList((prev) => prev.filter((task) => task.id !== id));
  };
  const moveTask = (id: string, status: KanbanTask['status']) => {
    if (!canEdit) return;
    updateTaskList((prev) => prev.map((task) => (task.id === id ? { ...task, status } : task)));
  };
  const updateTaskDetails = (id: string, updates: Partial<KanbanTask>) => {
    if (!canEdit) return;
    updateTaskList((prev) => prev.map((task) => (task.id === id ? { ...task, ...updates } : task)));
  };

  return (
    <>
      <div className="lg:col-span-2">
        <KanbanBoard
          tasks={tasks}
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
          <KanbanTaskList tasks={tasks} onSelectTask={(task) => setSelectedTaskId(task.id)} />
        </div>
      )}
      <div className="lg:col-span-2">
        <KanbanTaskInspector task={selectedTask} disabled={!canEdit} onClose={() => setSelectedTaskId(null)} onUpdate={updateTaskDetails} />
      </div>
    </>
  );
};

type RiskPanelProps = {
  projectId: string;
  reportId: string | null;
  weekKey: string | null;
  reportRisks: Risk[];
  canManage: boolean;
  curatedRisks: ProjectRisk[];
  onAttachRisks: (riskIds: string[]) => void;
  onUpdateSnapshot: (snapshotId: string, probability: number, impact: number) => void;
  onUpdateLegacyRisks: (risks: Risk[]) => void;
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

const formatSnapshotDate = (value: string | null | undefined, options: Intl.DateTimeFormatOptions): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('da-DK', options).format(date);
};

const textOrPlaceholder = (value: string | null | undefined) => (value && value.trim().length > 0 ? value : 'Ikke angivet');

const SnapshotRiskDetailsPanel = ({ risk, totalRisks, weekKey }: { risk: ProjectRisk | null; totalRisks: number; weekKey: string | null }) => {
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

  const archivedLabel = risk.isArchived ? `Arkiveret siden ${formatSnapshotDate(risk.projectRiskUpdatedAt, SNAPSHOT_DATE_OPTIONS) ?? ''}`.trim() : null;
  const scoreLabel = `Score ${risk.score} (S ${risk.probability} / K ${risk.impact})`;
  const dueDate = formatSnapshotDate(risk.dueDate, SNAPSHOT_DATE_OPTIONS) ?? 'Ikke angivet';
  const lastFollowUp = formatSnapshotDate(risk.lastFollowUpAt, SNAPSHOT_DATE_TIME_OPTIONS) ?? 'Ikke angivet';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">Detaljer for valgte risiko</h4>
          <p className="text-sm text-slate-600">{weekKey ? `Snapshot for ${weekKey}` : 'Snapshot baseret på denne rapport.'}</p>
        </div>
        {archivedLabel && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">{archivedLabel}</span>}
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
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${risk.category.badge}`}>{risk.category.label}</span>
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
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{textOrPlaceholder(risk.description)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 p-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opfølgningsnoter</h5>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{textOrPlaceholder(risk.followUpNotes)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 p-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan A</h5>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{textOrPlaceholder(risk.mitigationPlanA)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 p-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan B</h5>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{textOrPlaceholder(risk.mitigationPlanB)}</p>
        </div>
      </div>
    </section>
  );
};

const RiskPanel = ({
  projectId,
  reportId,
  weekKey,
  reportRisks,
  canManage,
  curatedRisks,
  onAttachRisks,
  onUpdateSnapshot,
  onUpdateLegacyRisks,
}: RiskPanelProps) => {
  const snapshotProjectRisks = useMemo<ProjectRisk[]>(() => {
    if (!PROJECT_RISK_ANALYSIS_ENABLED) {
      return [];
    }
    return (reportRisks ?? [])
      .filter((risk) => Boolean(risk.projectRiskId))
      .map((risk) => snapshotToProjectRisk(risk, projectId));
  }, [projectId, reportRisks]);

  const [selectedSnapshotRiskId, setSelectedSnapshotRiskId] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedReportRiskIds, setSelectedReportRiskIds] = useState<string[]>([]);
  const [selectorError, setSelectorError] = useState<string | null>(null);
  const [riskMatrixError, setRiskMatrixError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedReportRiskIds(reportRisks.map((risk) => risk.projectRiskId ?? risk.id));
  }, [reportRisks]);

  useEffect(() => {
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

  const handleToggleReportRiskSelection = useCallback((riskId: string) => {
    setSelectedReportRiskIds((prev) => (prev.includes(riskId) ? prev.filter((id) => id !== riskId) : [...prev, riskId]));
  }, []);

  const selectedSnapshotRisk = useMemo(
    () => snapshotProjectRisks.find((risk) => risk.id === selectedSnapshotRiskId) ?? null,
    [snapshotProjectRisks, selectedSnapshotRiskId],
  );

  if (!reportId) {
    return null;
  }

  if (!PROJECT_RISK_ANALYSIS_ENABLED) {
    return (
      <div className="lg:col-span-2">
        <RiskMatrix
          risks={reportRisks}
          updateRiskPosition={(id, probability, impact) => {
            const next = reportRisks.map((risk) => (risk.id === id ? { ...risk, s: probability, k: impact } : risk));
            onUpdateLegacyRisks(next);
          }}
          addRisk={() => {
            const next = [...reportRisks, { id: generateId(), name: 'Ny risiko', s: 1, k: 1 }];
            onUpdateLegacyRisks(next);
          }}
          updateRiskName={(id, name) => {
            const next = reportRisks.map((risk) => (risk.id === id ? { ...risk, name } : risk));
            onUpdateLegacyRisks(next);
          }}
          deleteRisk={(id) => onUpdateLegacyRisks(reportRisks.filter((risk) => risk.id !== id))}
        />
      </div>
    );
  }

  return (
    <div className="lg:col-span-2">
      {canManage && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            disabled={!reportId}
            onClick={() => {
              setSelectorError(null);
              setIsSelectorOpen(true);
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
          onMoveRisk={(riskId, probability, impact) => {
            setRiskMatrixError(null);
            onUpdateSnapshot(riskId, probability, impact);
          }}
          disabled={!canManage}
        />
        {riskMatrixError && <p className="text-sm text-red-600">{riskMatrixError}</p>}
        <SnapshotRiskDetailsPanel risk={selectedSnapshotRisk} totalRisks={snapshotProjectRisks.length} weekKey={weekKey} />
      </div>
      {isSelectorOpen && (
        <div className="fixed inset-0 z-40 flex bg-black/30">
          <div className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Synkroniser risici</h3>
                <p className="text-sm text-slate-600">Vælg hvilke kuraterede risici der skal vises i denne rapport.</p>
              </div>
              <button type="button" onClick={() => setIsSelectorOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">
                Luk
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              {curatedRisks.length === 0 ? (
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
                          onChange={() => handleToggleReportRiskSelection(risk.id)}
                        />
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">{risk.title}</span>
                            {risk.isArchived && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Arkiveret</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span>S {risk.probability}</span>
                            <span>K {risk.impact}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>{meta.label}</span>
                            {risk.owner?.name && <span>Ansvarlig: {risk.owner.name}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectorError && <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{selectorError}</p>}
            </div>
            <div className="flex items-center justify-between gap-3 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsSelectorOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectorError(null);
                  onAttachRisks([...selectedReportRiskIds]);
                  setIsSelectorOpen(false);
                }}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Gem risici
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type NewReportModalProps = {
  availableWeeks: string[];
  onClose: () => void;
  onSelect: (weekKey: string) => void;
};

const NewReportModal = ({ availableWeeks, onClose, onSelect }: NewReportModalProps) => {
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
          <p className="text-sm text-slate-500 p-3 bg-slate-100 rounded-md">Der er ingen flere ledige uger i projektperioden.</p>
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

export const ProjectReportsPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const { canManage } = projectManager;
  const projectId = project.id;
  const queryClient = useQueryClient();
  const timelineHelpers = useMemo(
    () => buildTimelineHelpers(project.config.projectStartDate, project.config.projectEndDate),
    [project.config.projectEndDate, project.config.projectStartDate],
  );

  const reportsQuery = useProjectReports(projectId);
  const reports = reportsQuery.reports;
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (reports.length === 0) {
      setActiveReportId(null);
      return;
    }
    if (activeReportId && reports.some((report) => report.id === activeReportId)) {
      return;
    }
    const latestId = pickLatestReportId(reports);
    setActiveReportId(latestId);
  }, [activeReportId, reports]);

  const activeSummary = useMemo(() => reports.find((report) => report.id === activeReportId) ?? null, [activeReportId, reports]);

  const { report: activeReport, query: reportQuery } = useReportDetail(activeReportId);

  const timelineSnapshot = activeReport?.state
    ? {
        phases: activeReport.state.phases ?? [],
        milestones: activeReport.state.milestones ?? [],
        deliverables: activeReport.state.deliverables ?? [],
      }
    : null;

  const availableWeeks = useMemo(
    () => getAvailableWeeks(project.config.projectStartDate, project.config.projectEndDate, reports.map((r) => r.weekKey)),
    [project.config.projectEndDate, project.config.projectStartDate, reports],
  );

  const statusMutation = useReportStatusCards();
  const kanbanMutation = useReportKanban();
  const riskMutation = useReportRiskMatrix();

  const createReportMutation = useMutation({
    mutationFn: async (weekKey: string) => {
      const snapshot = await planApi.getSnapshot(projectId);
      const seedState = buildReportStateFromPlan(snapshot, project);
      return reportApi.createReport(projectId, { weekKey, state: seedState });
    },
    onSuccess: (created) => {
      setCreateError(null);
      queryClient.setQueryData<ReportSummary[]>(reportKeys.project(projectId), (prev = []) =>
        [...prev.filter((item) => item.id !== created.id), { id: created.id, projectId: created.projectId, weekKey: created.weekKey }].sort((a, b) =>
          b.weekKey.localeCompare(a.weekKey),
        ),
      );
      queryClient.setQueryData(reportKeys.detail(created.id), created);
      setActiveReportId(created.id);
      setIsNewReportModalOpen(false);
    },
    onError: (error: any) => {
      const message = error?.message ?? 'Kunne ikke oprette rapporten. Tjek forbindelse og CSRF.';
      setCreateError(message);
      console.error('createReport failed', error);
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => reportApi.deleteReport(reportId),
    onSuccess: (_, reportId) => {
      queryClient.setQueryData<ReportSummary[]>(reportKeys.project(projectId), (prev = []) => prev.filter((item) => item.id !== reportId));
      queryClient.removeQueries({ queryKey: reportKeys.detail(reportId) });
      const remaining = queryClient.getQueryData<ReportSummary[]>(reportKeys.project(projectId)) ?? [];
      setActiveReportId(pickLatestReportId(remaining));
    },
  });

  const attachRisksMutation = useMutation({
    mutationFn: async (riskIds: string[]) => {
      if (!activeReport?.id) throw new Error('Rapporten er ikke gemt endnu.');
      const snapshots = await api.attachReportRisks(activeReport.id, riskIds);
      return snapshots.map(projectRiskToReportState);
    },
    onSuccess: (risks) => {
      if (!activeReport?.id) return;
      queryClient.setQueryData(reportKeys.detail(activeReport.id), (prev: any) =>
        prev ? { ...prev, state: { ...prev.state, risks } } : prev,
      );
    },
  });

  const updateSnapshotMutation = useMutation({
    mutationFn: async ({ snapshotId, probability, impact }: { snapshotId: string; probability: number; impact: number }) => {
      if (!activeReport?.id) throw new Error('Rapporten er ikke gemt endnu.');
      return api.updateReportRiskSnapshot(activeReport.id, snapshotId, { probability, impact });
    },
    onSuccess: (updatedSnapshot) => {
      if (!activeReport?.id) return;
      queryClient.setQueryData(reportKeys.detail(activeReport.id), (prev: any) => {
        if (!prev) return prev;
        const nextRisks = prev.state.risks.map((risk: Risk) =>
          risk.id === updatedSnapshot.id ? { ...risk, s: updatedSnapshot.probability, k: updatedSnapshot.impact } : risk,
        );
        return { ...prev, state: { ...prev.state, risks: nextRisks } };
      });
    },
  });

  const isBusy =
    statusMutation.isPending ||
    kanbanMutation.isPending ||
    riskMutation.isPending ||
    attachRisksMutation.isPending ||
    updateSnapshotMutation.isPending ||
    createReportMutation.isPending ||
    deleteReportMutation.isPending ||
    reportQuery.isFetching;

  const handleStatusChange = useCallback(
    (payload: Partial<Pick<ProjectState, 'statusItems' | 'challengeItems' | 'nextStepItems' | 'mainTableRows'>>) => {
      if (!activeReport?.id) return;
      const nextState: Partial<ProjectState> = {};
      if (payload.statusItems !== undefined) nextState.statusItems = payload.statusItems;
      if (payload.challengeItems !== undefined) nextState.challengeItems = payload.challengeItems;
      if (payload.nextStepItems !== undefined) nextState.nextStepItems = payload.nextStepItems;
      if (payload.mainTableRows !== undefined) nextState.mainTableRows = payload.mainTableRows;
      statusMutation.mutate({ reportId: activeReport.id, ...nextState });
      queryClient.setQueryData(reportKeys.detail(activeReport.id), (prev: any) =>
        prev ? { ...prev, state: { ...prev.state, ...nextState } } : prev,
      );
    },
    [activeReport?.id, queryClient, statusMutation],
  );

  const handleMainTableStatus = useCallback(
    (rowId: string) => {
      if (!activeReport?.id) return;
      const currentRows = activeReport.state?.mainTableRows ?? [];
      const nextRows: MainTableRow[] = currentRows.map((row) => {
        if (row.id !== rowId) return row;
        const nextStatus = row.status === 'green' ? 'yellow' : row.status === 'yellow' ? 'red' : 'green';
        return { ...row, status: nextStatus };
      });
      handleStatusChange({ mainTableRows: nextRows });
    },
    [activeReport?.id, activeReport?.state?.mainTableRows, handleStatusChange],
  );

  const handleMainTableNote = useCallback(
    (rowId: string, note: string) => {
      if (!activeReport?.id) return;
      const currentRows = activeReport.state?.mainTableRows ?? [];
      const nextRows = currentRows.map((row) => (row.id === rowId ? { ...row, note } : row));
      handleStatusChange({ mainTableRows: nextRows });
    },
    [activeReport?.id, activeReport?.state?.mainTableRows, handleStatusChange],
  );

  const handleKanbanUpdate = useCallback(
    (tasks: KanbanTask[]) => {
      if (!activeReport?.id) return;
      kanbanMutation.mutate({ reportId: activeReport.id, kanbanTasks: tasks });
      queryClient.setQueryData(reportKeys.detail(activeReport.id), (prev: any) =>
        prev ? { ...prev, state: { ...prev.state, kanbanTasks: tasks } } : prev,
      );
    },
    [activeReport?.id, kanbanMutation, queryClient],
  );

  const handleLegacyRiskUpdate = useCallback(
    (risks: Risk[]) => {
      if (!activeReport?.id) return;
      riskMutation.mutate({ reportId: activeReport.id, risks });
      queryClient.setQueryData(reportKeys.detail(activeReport.id), (prev: any) =>
        prev ? { ...prev, state: { ...prev.state, risks } } : prev,
      );
    },
    [activeReport?.id, queryClient, riskMutation],
  );

  const curatedRisksQuery = useCuratedProjectRisks(PROJECT_RISK_ANALYSIS_ENABLED ? project.id : null);
  const curatedRisks: ProjectRisk[] = curatedRisksQuery.risks ?? [];

  let content: React.ReactNode = null;

  if (reportsQuery.isLoading || reportQuery.isLoading) {
    content = <div className="p-6">Indlæser rapporter...</div>;
  } else if (reportQuery.error) {
    content = (
      <div className="text-center bg-white p-10 rounded-lg shadow-sm">
        <h2>Kunne ikke indlæse rapporten</h2>
        <p className="mt-2 text-sm text-slate-600">{reportQuery.error instanceof Error ? reportQuery.error.message : 'Ukendt fejl'}</p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={() => reportQuery.refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700"
          >
            Prøv igen
          </button>
          {canManage && (
            <button
              onClick={() => setIsNewReportModalOpen(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-700"
            >
              Opret ny rapport
            </button>
          )}
        </div>
      </div>
    );
  } else if (!activeReport || !activeSummary) {
    content = (
      <div className="text-center bg-white p-10 rounded-lg shadow-sm">
        <h2>Ingen rapporter</h2>
        {canManage && (
          <button
            onClick={() => setIsNewReportModalOpen(true)}
            className="mt-4 bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600"
          >
            Opret første rapport
          </button>
        )}
      </div>
    );
  } else {
    const reportStats = {
      risks: activeReport.state.risks?.length ?? 0,
      phases: activeReport.state.phases?.length ?? 0,
      milestones: activeReport.state.milestones?.length ?? 0,
      deliverables: activeReport.state.deliverables?.length ?? 0,
      tasks: activeReport.state.kanbanTasks?.length ?? 0,
    };

    content = (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <ReportWeekSelector
            reports={reports}
            activeReportId={activeReportId}
            onSelect={(id) => setActiveReportId(id)}
            onCreateWeek={() => setIsNewReportModalOpen(true)}
            onCreateNext={() => {
              const next = findNextWeekKey(reports, project.config.projectEndDate) ?? availableWeeks[0];
              if (!next) {
                setCreateError('Ingen ledige uger inden for projektets periode.');
                return;
              }
              createReportMutation.mutate(next);
            }}
            onDelete={(id) => deleteReportMutation.mutate(id)}
            disabled={!canManage || isBusy}
            collapsed={isHistoryCollapsed}
            setCollapsed={setIsHistoryCollapsed}
          />
          {activeReport && activeSummary ? (
            <main id="report-content" className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 w-full">
              {createError && (
                <div className="lg:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {createError}
                </div>
              )}
              <div className="lg:col-span-2">
                <ProjectReportHeader
                  projectName={project.config.projectName}
                  projectStatus={project.status}
                  projectStartDate={project.config.projectStartDate}
                  projectEndDate={project.config.projectEndDate}
                  reportWeekKey={activeSummary.weekKey}

                  stats={reportStats}
                />
              </div>
              <StatusPanels
                state={activeReport.state}
                canEdit={canManage && !isBusy}
                onChange={handleStatusChange}
                onCycleStatus={handleMainTableStatus}
                onUpdateNote={handleMainTableNote}
              />
              {timelineSnapshot && (
                <>
                  <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Snapshot fra rapporten (uge {formatWeekLabel(activeSummary.weekKey)}) – tidslinjen er read-only her og afspejler planen på oprettelsestidspunktet. Opdatér tidsplanen under fanen "Tidsplan".
                  </div>
                  <TimelinePanel
                    state={{
                      ...getInitialProjectState(),
                      phases: timelineSnapshot.phases,
                      milestones: timelineSnapshot.milestones,
                      deliverables: timelineSnapshot.deliverables,
                      workstreams: project.workstreams ?? [],
                    }}
                    projectStartDate={project.config.projectStartDate ?? ''}
                    projectEndDate={project.config.projectEndDate ?? ''}
                    helpers={timelineHelpers}
                  />
                </>
              )}
              <KanbanPanel tasks={activeReport.state.kanbanTasks ?? []} canEdit={canManage && !isBusy} onUpdate={handleKanbanUpdate} />
              <RiskPanel
                projectId={projectId}
                reportId={activeReport.id ?? null}
                weekKey={activeSummary.weekKey}
                reportRisks={activeReport.state.risks ?? []}
                canManage={canManage && !isBusy}
                curatedRisks={curatedRisks}
                onAttachRisks={(riskIds) => attachRisksMutation.mutate(riskIds)}
                onUpdateSnapshot={(snapshotId, probability, impact) => {
                  updateSnapshotMutation.mutate({ snapshotId, probability, impact });
                }}
                onUpdateLegacyRisks={handleLegacyRiskUpdate}
              />
            </main>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      {isBusy && <SyncStatusPill message="Synkroniserer rapportændringer..." className="fixed bottom-6 right-4 sm:right-6 pointer-events-none z-40 drop-shadow-lg" />}
      {content}
      {isNewReportModalOpen && (
        <NewReportModal
          availableWeeks={availableWeeks}
          onClose={() => setIsNewReportModalOpen(false)}
          onSelect={(key) => {
            createReportMutation.mutate(key);
          }}
        />
      )}
    </>
  );
};

export default ProjectReportsPage;



