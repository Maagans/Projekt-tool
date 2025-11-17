import React, { useMemo } from 'react';
import type { KanbanTask } from '../types';

const STATUS_LABELS: Record<KanbanTask['status'], { text: string; color: string }> = {
  todo: { text: 'Planlagt', color: 'bg-slate-100 text-slate-600' },
  doing: { text: 'I gang', color: 'bg-blue-100 text-blue-700' },
  done: { text: 'Afsluttet', color: 'bg-green-100 text-green-700' },
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
};

type KanbanTaskListProps = {
  tasks: KanbanTask[];
  onSelectTask?: (task: KanbanTask) => void;
};

export const KanbanTaskList: React.FC<KanbanTaskListProps> = ({ tasks, onSelectTask }) => {
  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      }),
    [tasks],
  );

  if (sortedTasks.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Ingen opgaver at vise.
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Opgave</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Ansvarlig</th>
              <th className="px-3 py-2 text-left">Deadline</th>
              <th className="px-3 py-2 text-left">Oprettet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTasks.map((task) => (
              <tr
                key={task.id}
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => onSelectTask?.(task)}
              >
                <td className="px-3 py-2 text-slate-900">{task.content}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_LABELS[task.status].color}`}>
                    {STATUS_LABELS[task.status].text}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">{task.assignee || '-'}</td>
                <td className="px-3 py-2 text-slate-700">{formatDate(task.dueDate)}</td>
                <td className="px-3 py-2 text-slate-500">{formatDate(task.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default KanbanTaskList;
