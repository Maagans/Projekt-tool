import React from 'react';
import { Deliverable } from '../types';

interface DeliverablesListProps {
  deliverables: Deliverable[];
  calculateDateFromPosition: (pos: number) => string;
}

export const DeliverablesList: React.FC<DeliverablesListProps> = ({ deliverables, calculateDateFromPosition }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-bold mb-3 text-slate-700">Centrale Leverancer</h3>
      {deliverables.length > 0 ? (
        <ul className="space-y-2 flex-grow overflow-y-auto pr-2">
          {deliverables
            .slice() // Create a shallow copy to avoid mutating the original array
            .sort((a, b) => a.position - b.position)
            .map(d => (
              <li key={d.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md gap-2">
                <span className="text-sm font-medium text-slate-800">{d.text}</span>
                <span className="text-sm font-semibold text-teal-600 bg-teal-100 px-2 py-1 rounded-full whitespace-nowrap">
                  {calculateDateFromPosition(d.position)}
                </span>
              </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 my-auto text-center">Ingen leverancer defineret i tidslinjen.</p>
      )}
    </div>
  );
};

