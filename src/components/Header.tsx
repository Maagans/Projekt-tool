import React, { useState, useMemo, useEffect } from 'react';
import { Project, ProjectConfig } from '../types.ts';
import { CalendarIcon, SaveIcon, PlusIcon, DownloadIcon, StepForwardIcon } from './Icons.tsx';
import { EditableField } from './EditableField.tsx';

// Declare external library functions from global scope
declare const jspdf: any;
declare const html2canvas: any;

interface HeaderProps {
  workspace: { [projectName: string]: Project };
  activeProject: string | null;
  activeWeekKey: string | null;
  projectConfig: ProjectConfig | null | undefined;
  getWeekKey: (date?: Date) => string;
  createNewProject: (name: string) => void;
  selectProject: (name: string) => void;
  setActiveWeekKey: (key: string) => void;
  createNewReport: (key: string, copy: boolean) => void;
  createNextReport: () => void;
  updateProjectConfig: (newConfig: Partial<ProjectConfig>) => void;
}

export const Header: React.FC<HeaderProps> = (props) => {
    const { 
        workspace, activeProject, activeWeekKey, projectConfig, 
        getWeekKey, createNewProject, selectProject, setActiveWeekKey, 
        createNewReport, createNextReport, updateProjectConfig 
    } = props;
  
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [selectedWeekForNewReport, setSelectedWeekForNewReport] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const currentProject = activeProject ? workspace[activeProject] : null;

  const availableWeeks = useMemo(() => {
    if (!projectConfig || !currentProject) return [];
    
    const weeks = new Set<string>();
    try {
        const start = new Date(projectConfig.projectStartDate);
        const end = new Date(projectConfig.projectEndDate);
        if (start > end) return [];

        const current = new Date(start);

        while (current <= end) {
            weeks.add(getWeekKey(new Date(current)));
            current.setDate(current.getDate() + 7);
        }
    } catch (e) {
        console.error("Invalid date format in project config", e);
        return [];
    }

    const existingWeeks = currentProject?.reports.map(r => r.weekKey) || [];
    const allWeeks = Array.from(weeks).sort().reverse();
    return allWeeks.filter(w => !existingWeeks.includes(w));
  }, [projectConfig, currentProject, getWeekKey]);

  useEffect(() => {
    if (isNewReportModalOpen) {
        if (!selectedWeekForNewReport || !availableWeeks.includes(selectedWeekForNewReport)) {
            setSelectedWeekForNewReport(availableWeeks[0] ?? '');
        }
    } else {
        setSelectedWeekForNewReport('');
    }
  }, [isNewReportModalOpen, availableWeeks, selectedWeekForNewReport]);

  const handleCreateProject = () => {
    if(newProjectName.trim()) {
        createNewProject(newProjectName.trim());
        setNewProjectName("");
        setShowNewProject(false);
    }
  };

  const handleCreateReport = () => {
    if (selectedWeekForNewReport) {
      createNewReport(selectedWeekForNewReport, true);
      setIsNewReportModalOpen(false);
    }
  };

  const handleExportJson = () => {
    if (!activeProject || !workspace[activeProject]) return;
    const data = workspace[activeProject];
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    const date = new Date().toISOString().split('T')[0];
    link.download = `projekt-rapport-${activeProject.toLowerCase().replace(/\s/g, '-')}-${date}.json`;
    link.click();
  };

  const handleExportPdf = async () => {
    const reportContent = document.getElementById('report-content');
    if (!reportContent) {
        console.error("Report content element not found!");
        return;
    }

    setIsExporting(true);
    document.body.classList.add('pdf-export-active');
    
    // Give browser a moment to apply styles
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        // Ensure fonts are loaded to prevent layout shifts
        await document.fonts.ready;
        
        const canvas = await html2canvas(reportContent, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: false,
            backgroundColor: '#f1f5f9',
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const usableWidth = pdfWidth - (margin * 2);
        const usableHeight = pdfHeight - (margin * 2);

        const canvasAspectRatio = canvas.width / canvas.height;
        const pageAspectRatio = usableWidth / usableHeight;

        let renderWidth, renderHeight;
        if (canvasAspectRatio > pageAspectRatio) {
            renderWidth = usableWidth;
            renderHeight = renderWidth / canvasAspectRatio;
        } else {
            renderHeight = usableHeight;
            renderWidth = renderHeight * canvasAspectRatio;
        }

        const xOffset = margin + (usableWidth - renderWidth) / 2;
        const yOffset = margin + (usableHeight - renderHeight) / 2;
        
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
        pdf.save(`rapport-${projectConfig?.projectName || 'projekt'}-${activeWeekKey}.pdf`);

    } catch (error) {
        console.error("Fejl under PDF-eksport:", error);
        alert("Der opstod en fejl under PDF-eksporten. Prøv venligst igen.");
    } finally {
        setIsExporting(false);
        document.body.classList.remove('pdf-export-active');
    }
  };
  
  return (
    <header className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col gap-4 export-hide">
        <div className="flex flex-wrap justify-between items-center gap-4">
            {projectConfig ? (
                 <div className="flex-1 min-w-[200px]">
                    <EditableField 
                        initialValue={projectConfig.projectName}
                        onSave={(newName) => updateProjectConfig({ projectName: newName })}
                        className="text-2xl font-bold text-slate-800"
                    />
                 </div>
            ) : <h1 className="text-2xl font-bold text-slate-800">Projekt Status Rapport</h1>}
           
            <div className="flex items-center gap-2">
                <select 
                    value={activeProject || ""} 
                    onChange={e => selectProject(e.target.value)}
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm font-semibold"
                >
                    <option value="" disabled>{Object.keys(workspace).length > 0 ? "Vælg projekt" : "Ingen projekter"}</option>
                    {Object.keys(workspace).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <button onClick={() => setShowNewProject(true)} className="flex items-center gap-1 text-sm bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600">
                    <PlusIcon/> Nyt Projekt
                </button>
            </div>
        </div>

       {showNewProject && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100">
                <input 
                    type="text" 
                    value={newProjectName} 
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="Nyt projektnavn..."
                    className="bg-white text-slate-900 border border-slate-300 rounded-md p-2 text-sm flex-grow"
                    onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                />
                <button onClick={handleCreateProject} className="bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600">Opret</button>
                <button onClick={() => setShowNewProject(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md text-sm hover:bg-slate-300">Annuller</button>
            </div>
       )}

      {activeProject && projectConfig && (
        <div className="border-t pt-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                    <CalendarIcon />
                    <span className="font-semibold text-slate-700">Periode:</span>
                </div>
                <input 
                    type="date"
                    value={projectConfig.projectStartDate}
                    onChange={(e) => updateProjectConfig({ projectStartDate: e.target.value })}
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm"
                    style={{ colorScheme: 'light' }}
                />
                <span className="text-slate-500">-</span>
                <input 
                    type="date"
                    value={projectConfig.projectEndDate}
                    onChange={(e) => updateProjectConfig({ projectEndDate: e.target.value })}
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm"
                    style={{ colorScheme: 'light' }}
                />
            </div>
             <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Rapport for uge:</span>
                <select 
                    value={activeWeekKey || ""} 
                    onChange={e => setActiveWeekKey(e.target.value)}
                    className="bg-white border border-slate-300 rounded-md p-2 text-sm"
                    disabled={!currentProject?.reports.length}
                >
                    <option value="" disabled>Vælg uge</option>
                    {currentProject?.reports.sort((a,b) => b.weekKey.localeCompare(a.weekKey)).map(r => (
                        <option key={r.weekKey} value={r.weekKey}>{r.weekKey}</option>
                    ))}
                </select>
                 <button onClick={() => setIsNewReportModalOpen(true)} className="flex items-center gap-1 text-sm bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600" title="Opret ny rapport for en specifik uge">
                    <PlusIcon/> Ny rapport
                </button>
                <button 
                    onClick={createNextReport}
                    className="flex items-center gap-1 text-sm bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600"
                    title="Opret rapport for næste uge baseret på den seneste"
                >
                    <StepForwardIcon /> Næste rapport
                </button>
                 <button 
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-semibold w-[170px] disabled:bg-red-400 disabled:cursor-wait"
                    >
                    {isExporting ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Genererer...</span>
                        </>
                    ) : (
                        <>
                            <DownloadIcon />
                            <span>Eksportér PDF</span>
                        </>
                    )}
                </button>
                 <button 
                    onClick={handleExportJson}
                    className="flex items-center gap-2 text-sm bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors font-semibold"
                    >
                    <SaveIcon />
                    Eksportér Data
                </button>
             </div>
        </div>
      )}

      {isNewReportModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-slate-800">Opret ny ugerapport</h3>
                <div className="space-y-2">
                    <label htmlFor="week-select" className="block text-sm font-medium text-slate-700">Vælg uge for rapporten</label>
                    {availableWeeks.length > 0 ? (
                        <select
                            id="week-select"
                            value={selectedWeekForNewReport}
                            onChange={(e) => setSelectedWeekForNewReport(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {availableWeeks.map(week => <option key={week} value={week}>{week}</option>)}
                        </select>
                    ) : (
                        <p className="text-sm text-slate-500 p-3 bg-slate-100 rounded-md border border-slate-200">Der er ingen tilgængelige uger at oprette rapport for i den valgte projektperiode.</p>
                    )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setIsNewReportModalOpen(false)} className="bg-slate-200 text-slate-800 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-300">Annuller</button>
                    <button 
                        onClick={handleCreateReport}
                        disabled={!selectedWeekForNewReport}
                        className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        Opret Rapport
                    </button>
                </div>
            </div>
        </div>
    )}
    </header>
  );
};
