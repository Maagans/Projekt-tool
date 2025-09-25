import React, { useState } from 'react';
import { Risk } from '../types.ts';
import { PlusIcon, TrashIcon } from './Icons.tsx';
import { EditableField } from './EditableField.tsx';

interface RiskMatrixProps {
  risks: Risk[];
  updateRiskPosition: (id: string, s: number, k: number) => void;
  updateRiskName: (id: string, name: string) => void;
  addRisk: () => void;
  deleteRisk: (id: string) => void;
}

const getRiskColor = (s: number, k: number) => {
    const score = s * k;
    if (score >= 15) return 'bg-red-500';
    if (score >= 10) return 'bg-orange-500';
    if (score >= 5) return 'bg-yellow-400';
    return 'bg-green-400';
};

export const RiskMatrix: React.FC<RiskMatrixProps> = ({ risks, updateRiskPosition, addRisk, updateRiskName, deleteRisk }) => {
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [draggedOverCell, setDraggedOverCell] = useState<{ s: number; k: number } | null>(null);

  const handleCellClick = (s: number, k: number) => {
    if (selectedRiskId !== null) {
      updateRiskPosition(selectedRiskId, s, k);
    }
  };

  const handleDragStart = (e: React.DragEvent, riskId: string) => {
    e.dataTransfer.setData('application/risk-id', riskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, s: number, k: number) => {
    e.preventDefault();
    const riskId = e.dataTransfer.getData('application/risk-id');
    if (riskId) {
        updateRiskPosition(riskId, s, k);
    }
    setDraggedOverCell(null);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-slate-700">Risikomatrix</h3>
        <button
          onClick={addRisk}
          className="flex items-center gap-1 text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors export-hide"
        >
          <PlusIcon /> Tilføj Risiko
        </button>
      </div>
      
      <div className="flex-grow flex gap-4">
        <div className="w-1/2 flex flex-col items-center pr-4 border-r border-slate-200">
            <div className="font-bold text-slate-600 text-sm mb-1">Sandsynlighed (S)</div>
            <div className="flex">
                <div className="flex flex-col-reverse justify-around items-center w-8 mr-1">
                    {Array.from({ length: 5 }, (_, i) => <div key={`k-label-${i}`} className="font-semibold text-slate-500 text-sm h-full flex items-center">{5-i}</div>)}
                </div>
                <div className="grid grid-cols-5 grid-rows-5 gap-1 w-full aspect-square max-w-[300px]">
                    {Array.from({ length: 5 }, (_, k_idx) => (
                        Array.from({ length: 5 }, (_, s_idx) => {
                            const s = s_idx + 1;
                            const k = 5 - k_idx;
                            const risksInCell = risks.filter(r => r.s === s && r.k === k);
                            return (
                                <div
                                key={`${s}-${k}`}
                                onClick={() => handleCellClick(s, k)}
                                onDragOver={handleDragOver}
                                onDragEnter={() => setDraggedOverCell({ s, k })}
                                onDragLeave={() => setDraggedOverCell(null)}
                                onDrop={(e) => handleDrop(e, s, k)}
                                className={`rounded-md flex items-center justify-center cursor-pointer transition-all p-1 ${getRiskColor(s, k)} ${draggedOverCell && draggedOverCell.s === s && draggedOverCell.k === k ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:ring-2 hover:ring-blue-400'}`}
                                >
                                <div className="flex items-center justify-center -space-x-2 pointer-events-none">
                                  {risksInCell.map((risk) => {
                                      const riskIndex = risks.findIndex(r => r.id === risk.id);
                                      return (
                                        <div 
                                            key={risk.id} 
                                            className={`risk-circle w-6 h-6 bg-slate-800 rounded-full text-white flex items-center justify-center leading-none text-xs font-bold ring-2 transition-transform z-10 ${risk.id === selectedRiskId ? 'ring-blue-500 scale-110' : 'ring-white'}`}
                                            title={risk.name}
                                        >
                                          {riskIndex > -1 ? riskIndex + 1 : ''}
                                        </div>
                                    )
                                  })}
                                </div>
                                </div>
                            )
                        })
                    ))}
                </div>
                 <div className="font-bold text-slate-600 text-sm [writing-mode:vertical-rl] rotate-180 ml-2">Konsekvens (K)</div>
            </div>
             <div className="flex justify-around w-full max-w-[300px] ml-8 mt-1">
                {Array.from({ length: 5 }, (_, i) => <div key={`s-label-${i}`} className="font-semibold text-slate-500 text-sm">{i+1}</div>)}
            </div>
        </div>
        
        <div className="w-1/2 flex flex-col space-y-2 overflow-y-auto pl-4">
            <h4 className="font-bold text-slate-600">Risici</h4>
            {risks.length > 0 ? risks.map((risk, index) => (
                <div 
                  key={risk.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, risk.id)}
                  onClick={() => setSelectedRiskId(risk.id)}
                  className={`p-2 rounded-md border-l-4 transition-all cursor-grab ${selectedRiskId === risk.id ? 'bg-blue-100 border-blue-500' : 'bg-slate-50 border-slate-300'}`}
                >
                   <div className="flex justify-between items-start gap-1">
                     <div className="flex-grow flex items-center gap-2 risk-list-item-content">
                       <span className="risk-circle flex-shrink-0 w-6 h-6 bg-slate-800 rounded-full text-white flex items-center justify-center leading-none text-xs font-bold ring-1 ring-slate-400">{index + 1}</span>
                       <EditableField initialValue={risk.name} onSave={(newName) => updateRiskName(risk.id, newName)} />
                     </div>
                     <button onClick={(e) => {e.stopPropagation(); deleteRisk(risk.id)}} className="text-slate-400 hover:text-red-500 flex-shrink-0 p-1 export-hide"><TrashIcon /></button>
                   </div>
                   <div className="text-xs text-slate-500 mt-1">
                       S: {risk.s}, K: {risk.k}
                   </div>
                </div>
            )) : <p className="text-sm text-slate-500">Ingen risici tilføjet.</p>}
        </div>
      </div>
    </div>
  );
};

