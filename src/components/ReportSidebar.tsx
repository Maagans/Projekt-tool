import React from 'react';
import { Report } from '../types';
import { PlusIcon, CalendarIcon, StepForwardIcon, TrashIcon } from './Icons';

interface ReportSidebarProps {
  reports: Report[];
  activeWeekKey: string | null;
  highlightedWeekKey: string | null;
  onSelectReport: (weekKey: string) => void;
  onNewReportClick: () => void;
  onNextReportClick: () => void;
  onDeleteReport: (weekKey: string) => void;
}

export const ReportSidebar: React.FC<ReportSidebarProps> = ({ reports, activeWeekKey, highlightedWeekKey, onSelectReport, onNewReportClick, onNextReportClick, onDeleteReport }) => {
  return (
    <aside className="w-64 flex-shrink-0 bg-white p-4 rounded-lg shadow-sm flex flex-col export-hide">
      <h3 className="text-lg font-bold mb-3 text-slate-700">Rapporter</h3>
      <div className="flex items-center gap-2 mb-4">
        <button
            onClick={onNewReportClick}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 p-2 rounded-md transition-colors"
            title="Opret ny specifik ugerapport"
        >
            <PlusIcon /> Ny
        </button>
        <button
            onClick={onNextReportClick}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-green-600 bg-green-100 hover:bg-green-200 p-2 rounded-md transition-colors"
            title="Opret rapport for næste uge"
        >
            <StepForwardIcon /> Næste
        </button>
      </div>

      <div className="flex-grow overflow-y-auto -mr-2 pr-2">
        {reports.length > 0 ? (
          <ul className="space-y-1">
            {reports.map(report => {
                const isActive = report.weekKey === activeWeekKey;
                const isHighlighted = report.weekKey === highlightedWeekKey;
                let buttonClass = 'w-full text-left p-2 rounded-md text-sm font-medium flex items-center gap-3 transition-colors duration-1000';
                
                if (isActive) {
                    buttonClass += isHighlighted ? ' bg-green-500 text-white shadow' : ' bg-blue-500 text-white shadow';
                } else {
                    buttonClass += ' text-slate-600 hover:bg-slate-100';
                }

                return (
                    <li key={report.weekKey} className="group relative">
                        <button
                        onClick={() => onSelectReport(report.weekKey)}
                        className={buttonClass}
                        >
                        <CalendarIcon />
                        <span>{report.weekKey}</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Er du sikker på, at du vil slette rapporten for ${report.weekKey}? Handlingen kan ikke fortrydes.`)) {
                                    onDeleteReport(report.weekKey);
                                }
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Slet rapport"
                            >
                            <TrashIcon />
                        </button>
                  </li>
                );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">Ingen rapporter oprettet.</p>
        )}
      </div>
    </aside>
  );
};

