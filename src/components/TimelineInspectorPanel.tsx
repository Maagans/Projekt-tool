import React from 'react';
import { Phase, Milestone, Deliverable } from '../types';
import { EditableField } from './EditableField';

export type TimelineInspectorSelection =
  | { type: 'phase'; item: Phase }
  | { type: 'milestone'; item: Milestone }
  | { type: 'deliverable'; item: Deliverable };

interface TimelineInspectorPanelProps {
  selection: TimelineInspectorSelection | null;
  calculateDateFromPosition: (pos: number) => string;
  calculatePositionFromDate: (date: string) => number;
  updateTimelineItem: (
    type: 'phase' | 'milestone' | 'deliverable',
    id: string,
    updates: Partial<Phase | Milestone | Deliverable>
  ) => void;
  deleteTimelineItem: (type: 'phase' | 'milestone' | 'deliverable', id: string) => void;
  onClearSelection: () => void;
  phaseColors: Record<string, { bg: string; border: string }>;
}

const TYPE_LABELS: Record<TimelineInspectorSelection['type'], string> = {
  phase: 'Fase',
  milestone: 'Milepæl',
  deliverable: 'Leverance',
};

const clampPosition = (value: number) => Math.max(0, Math.min(100, value));

export const TimelineInspectorPanel: React.FC<TimelineInspectorPanelProps> = ({
  selection,
  calculateDateFromPosition,
  calculatePositionFromDate,
  updateTimelineItem,
  deleteTimelineItem,
  onClearSelection,
  phaseColors,
}) => {
  if (!selection) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Klik på en fase, milepæl eller leverance for at se og redigere detaljerne her.
      </div>
    );
  }

  const { type, item } = selection;
  const phaseItem = type === 'phase' ? (item as Phase) : null;
  const nonPhaseItem = type === 'phase' ? null : (item as Milestone | Deliverable);

  const toDateInputValue = (position?: number) => {
    if (typeof position !== 'number' || Number.isNaN(position)) {
      return '';
    }
    const isoDate = calculateDateFromPosition(position);
    return isoDate ? isoDate.slice(0, 10) : '';
  };

  const parseDateValue = (value: string) => {
    if (!value) {
      return null;
    }
    const position = calculatePositionFromDate(value);
    if (!Number.isFinite(position)) {
      return null;
    }
    return clampPosition(position);
  };

  const handlePhaseDateChange = (field: 'start' | 'end', value: string) => {
    if (!phaseItem) {
      return;
    }
    const nextPosition = parseDateValue(value);
    if (nextPosition === null) {
      return;
    }
    if (field === 'start') {
      const currentEnd = typeof phaseItem.end === 'number' ? phaseItem.end : nextPosition;
      const nextStart = Math.min(nextPosition, currentEnd);
      updateTimelineItem('phase', phaseItem.id, { start: nextStart, end: Math.max(nextStart, currentEnd) });
      return;
    }
    const currentStart = typeof phaseItem.start === 'number' ? phaseItem.start : nextPosition;
    const nextEnd = Math.max(nextPosition, currentStart);
    updateTimelineItem('phase', phaseItem.id, { end: nextEnd, start: Math.min(currentStart, nextEnd) });
  };

  const handleSingleDateChange = (value: string) => {
    if (type === 'phase') {
      return;
    }
    const nextPosition = parseDateValue(value);
    if (nextPosition === null) {
      return;
    }
    updateTimelineItem(type, item.id, { position: nextPosition });
  };

  const handleDelete = () => {
    deleteTimelineItem(type, item.id);
    onClearSelection();
  };

  const dateInputs =
    phaseItem ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-slate-500">Startdato</span>
          <input
            type="date"
            value={toDateInputValue(phaseItem.start)}
            onChange={(event) => handlePhaseDateChange('start', event.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-slate-500">Slutdato</span>
          <input
            type="date"
            value={toDateInputValue(phaseItem.end)}
            onChange={(event) => handlePhaseDateChange('end', event.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
      </div>
    ) : (
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold text-slate-500">Dato</span>
        <input
          type="date"
          value={toDateInputValue(nonPhaseItem?.position)}
          onChange={(event) => handleSingleDateChange(event.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </label>
    );

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">{TYPE_LABELS[type]}</p>
          <p className="text-xs text-slate-500">ID: {item.id}</p>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
        >
          Fravælg
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Navn</p>
          <EditableField
            initialValue={item.text}
            onSave={(textValue) => updateTimelineItem(type, item.id, { text: textValue })}
            className="!p-2 border border-slate-200 text-sm text-slate-700 shadow-inner"
            wrapDisplay
          />
        </div>

        {dateInputs}

        {phaseItem && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fasefarve</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(phaseColors).map(([key, color]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateTimelineItem('phase', phaseItem.id, { highlight: key })}
                  className={`h-7 w-7 rounded-full border-2 ${color.bg} ${
                    phaseItem.highlight === key ? color.border : 'border-transparent'
                  } transition hover:scale-105`}
                  title={key}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Slet element
          </button>
          <span className="text-xs text-slate-400">Ændringer gemmes automatisk</span>
        </div>
      </div>
    </div>
  );
};
