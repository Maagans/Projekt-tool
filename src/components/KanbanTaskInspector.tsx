import React, { useEffect, useState } from 'react';
import type { KanbanTask } from '../types';
import { EditableField } from './EditableField';

type KanbanTaskInspectorProps = {
  task: KanbanTask | null;
  disabled?: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void;
};

export const KanbanTaskInspector: React.FC<KanbanTaskInspectorProps> = ({
  task,
  disabled = false,
  onClose,
  onUpdate,
}) => {
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    setAssignee(task?.assignee ?? '');
    setDueDate(task?.dueDate ?? '');
  }, [task]);

  if (!task) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Klik på en opgave i Kanban-boardet for at se og redigere detaljer her.
      </section>
    );
  }

  const commit = (field: keyof KanbanTask, value: string | null) => {
    if (disabled) return;
    onUpdate(task.id, { [field]: value });
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Opgave detaljer</p>
          <h3 className="text-lg font-semibold text-slate-900">{task.content || 'Opgave uden titel'}</h3>
          <p className="text-xs text-slate-500">
            Status:{' '}
            <span className="font-semibold text-slate-700">
              {task.status === 'todo' ? 'Planlagt' : task.status === 'doing' ? 'I gang' : 'Afsluttet'}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="self-start rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
        >
          Fravælg
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span className="text-xs font-semibold uppercase text-slate-500">Ansvarlig</span>
          <input
            type="text"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            onBlur={() => commit('assignee', assignee.trim() === '' ? null : assignee)}
            disabled={disabled}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
            placeholder="Navn eller initialer"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span className="text-xs font-semibold uppercase text-slate-500">Deadline</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => {
              setDueDate(event.target.value);
              commit('dueDate', event.target.value || null);
            }}
            disabled={disabled}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
          />
        </label>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Noter</p>
        <EditableField
          initialValue={task.notes ?? ''}
          onSave={(value) => commit('notes', value || null)}
          disabled={disabled}
          isTextArea
          className="mt-1 min-h-[120px] border border-slate-200 text-sm text-slate-700"
          wrapDisplay
        />
      </div>
    </section>
  );
};
