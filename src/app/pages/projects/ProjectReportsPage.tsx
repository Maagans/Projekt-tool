import { useEffect, useMemo, useState } from 'react';
import { KanbanBoard } from '../../../components/KanbanBoard';
import { Timeline } from '../../../components/Timeline';
import { EditableList } from '../../../components/RichTextEditor';
import { MainStatusTable } from '../../../components/MainStatusTable';
import { DeliverablesList } from '../../../components/DeliverablesList';
import { RiskMatrix } from '../../../components/RiskMatrix';
import { CalendarIcon, PlusIcon, StepForwardIcon, TrashIcon } from '../../../components/Icons';
import { useProjectRouteContext } from './ProjectLayout';
import { ProjectResourcePanel } from './ProjectResourcePanel';

export const ProjectReportsPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const [activeWeekKey, setActiveWeekKey] = useState<string | null>(project.reports[0]?.weekKey ?? null);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);

  const actions = projectManager.projectActions(project.id, activeWeekKey);
  const activeReport = useMemo(
    () => project.reports.find((report) => report.weekKey === activeWeekKey) ?? null,
    [project, activeWeekKey],
  );
  const { canManage } = projectManager;

  useEffect(() => {
    if ((!activeWeekKey || !project.reports.some((report) => report.weekKey === activeWeekKey)) && project.reports.length > 0) {
      setActiveWeekKey(project.reports.sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0].weekKey);
    } else if (project.reports.length === 0) {
      setActiveWeekKey(null);
    }
  }, [project.reports, activeWeekKey]);

  if (!actions) return null;

  const { reportsManager, ...restActions } = actions;

  const handleCreateNext = () => {
    const newKey = reportsManager.createNext();
    if (newKey) setActiveWeekKey(newKey);
  };

  const handleDeleteReport = (weekKey: string) => {
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
    <div className="flex flex-col gap-6">
      <ProjectResourcePanel />
      <div className="flex flex-col lg:flex-row gap-6 items-start">
      <aside className="w-full lg:w-64 flex-shrink-0 bg-white p-4 rounded-lg shadow-sm flex flex-col export-hide self-stretch">
        <h3 className="text-lg font-bold mb-3 text-slate-700">Rapporter</h3>
        {canManage && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setIsNewReportModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 p-2 rounded-md transition-colors"
              title="Opret ny specifik ugerapport"
            >
              <PlusIcon /> Ny
            </button>
            <button
              onClick={handleCreateNext}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-green-600 bg-green-100 hover:bg-green-200 p-2 rounded-md transition-colors"
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
                  onClick={() => setActiveWeekKey(report.weekKey)}
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
            onAddTask={kanbanManager.add}
            onUpdateTask={kanbanManager.updateContent}
            onDeleteTask={kanbanManager.delete}
            onMoveTask={kanbanManager.updateStatus}
          />
        </div>
        <div className="lg:col-span-2">
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
            addTimelineItem={timelineManager.add}
            updateTimelineItem={timelineManager.update}
            deleteTimelineItem={timelineManager.delete}
          />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableList
            title="Status"
            items={activeReport.state.statusItems}
            onAddItem={statusListManager.addItem}
            onDeleteItem={statusListManager.deleteItem}
            onUpdateItem={statusListManager.updateItem}
            onReorderItems={statusListManager.reorderItems}
          />
          <EditableList
            title="Udfordringer"
            items={activeReport.state.challengeItems}
            onAddItem={challengeListManager.addItem}
            onDeleteItem={challengeListManager.deleteItem}
            onUpdateItem={challengeListManager.updateItem}
            onReorderItems={challengeListManager.reorderItems}
          />
        </div>
        <div className="lg:col-span-2">
          <MainStatusTable
            rows={activeReport.state.mainTableRows}
            cycleStatus={restActions.cycleStatus}
            updateNote={restActions.updateMainTableRowNote}
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
              updateRiskPosition={riskManager.updatePosition}
              addRisk={riskManager.add}
              updateRiskName={riskManager.updateName}
              deleteRisk={riskManager.delete}
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
