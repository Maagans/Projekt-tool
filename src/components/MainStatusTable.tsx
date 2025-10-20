import React, { useRef } from 'react';
import { MainTableRow } from '../types';

interface MainStatusTableProps {
  rows: MainTableRow[];
  cycleStatus: (id: string) => void;
  updateNote: (id: string, note: string) => void;
}

const statusClasses = {
  green: 'bg-green-500 ring-green-300',
  yellow: 'bg-yellow-500 ring-yellow-300',
  red: 'bg-red-500 ring-red-300',
};

const statusText = {
    green: 'I orden',
    yellow: 'Udfordret',
    red: 'Kritisk'
}

const EditableNote: React.FC<{ note: string, onUpdate: (note: string) => void }> = ({ note, onUpdate }) => {
    const noteRef = useRef<HTMLDivElement>(null);

    const handleBlur = () => {
        if(noteRef.current) {
            onUpdate(noteRef.current.innerHTML);
        }
    };

    return (
        <div 
          ref={noteRef}
          contentEditable
          onBlur={handleBlur}
          className="prose prose-sm max-w-none p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          dangerouslySetInnerHTML={{ __html: note }} 
        />
    );
}

export const MainStatusTable: React.FC<MainStatusTableProps> = ({ rows, cycleStatus, updateNote }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-bold mb-3 text-slate-700">Overordnet Status</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="p-2 text-left text-sm font-semibold text-slate-600 w-1/4">Område</th>
              <th className="p-2 text-left text-sm font-semibold text-slate-600 w-1/4">Status</th>
              <th className="p-2 text-left text-sm font-semibold text-slate-600 w-1/2">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2 font-medium text-slate-800 align-top">{row.title}</td>
                <td className="p-2 align-top">
                  <button
                    onClick={() => cycleStatus(row.id)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 w-full text-left p-2 rounded-md hover:bg-slate-200 transition-colors status-button-print-fix"
                    title={`Skift status for ${row.title}`}
                  >
                    <span className={`w-4 h-4 rounded-full ${statusClasses[row.status]} ring-2 ring-offset-1`}></span>
                    {statusText[row.status]}
                  </button>
                </td>
                <td className="p-0 text-sm text-slate-600 align-top">
                    <EditableNote note={row.note} onUpdate={(newNote) => updateNote(row.id, newNote)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


