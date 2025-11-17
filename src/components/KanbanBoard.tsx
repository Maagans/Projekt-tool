import React, { useState } from 'react';
import type { KanbanTask } from '../types';
import { PlusIcon, TrashIcon } from './Icons';
import { EditableField } from './EditableField';

type KanbanStatus = 'todo' | 'doing' | 'done';

const columnTitles: Record<KanbanStatus, string> = {
  todo: 'To Do',
  doing: 'I gang',
  done: 'Gennemført',
};

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onAddTask: (status: KanbanStatus) => void;
  onUpdateTask: (id: string, content: string) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (id: string, newStatus: KanbanStatus) => void;
  onSelectTask?: (task: KanbanTask) => void;
  headerActions?: React.ReactNode;
}

type KanbanCardProps = {
  task: KanbanTask;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onSelect?: ((task: KanbanTask) => void) | undefined;
  onDragStart?: ((taskId: string) => void) | undefined;
  onDragEnd?: (() => void) | undefined;
  isDragging: boolean;
};

const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  onUpdate,
  onDelete,
  onSelect,
  onDragStart,
  onDragEnd,
  isDragging,
}) => {
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/task-id', task.id);
    onDragStart?.(task.id);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect?.(task)}
      className={`group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition
        cursor-grab active:cursor-grabbing hover:shadow-md hover:border-slate-300
        ${isDragging ? 'scale-[1.03] border-blue-300 shadow-lg rotate-[0.6deg]' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 text-sm">
          <EditableField
            initialValue={task.content}
            onSave={(value) => onUpdate(task.id, value)}
            isTextArea
            className="!p-0 font-semibold text-slate-800 leading-5"
          />
          {(task.assignee || task.dueDate) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {task.assignee && <span className="rounded-full bg-slate-100 px-2 py-0.5">{task.assignee}</span>}
              {task.dueDate && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                  {new Date(task.dueDate).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="rounded-full p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 export-hide"
          onClick={() => onDelete(task.id)}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

type KanbanColumnProps = {
  status: KanbanStatus;
  tasks: KanbanTask[];
  onAddTask: (status: KanbanStatus) => void;
  onUpdateTask: (id: string, content: string) => void;
  onDeleteTask: (id: string) => void;
  onDrop: (event: React.DragEvent, status: KanbanStatus) => void;
  isDraggedOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onSelectTask?: ((task: KanbanTask) => void) | undefined;
  onDragStartCard?: ((taskId: string) => void) | undefined;
  onDragEndCard?: (() => void) | undefined;
  draggedTaskId: string | null;
};

const columnBackgrounds: Record<KanbanStatus, string> = {
  todo: 'from-blue-50/70 via-white to-white',
  doing: 'from-indigo-50/70 via-white to-white',
  done: 'from-emerald-50/70 via-white to-white',
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onDrop,
  isDraggedOver,
  onDragEnter,
  onDragLeave,
  onSelectTask,
  onDragStartCard,
  onDragEndCard,
  draggedTaskId,
}) => {
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(event, status)}
      className={`flex flex-1 flex-col rounded-2xl border bg-gradient-to-b ${columnBackgrounds[status]} p-4 transition ${
        isDraggedOver ? 'border-blue-400 border-dashed shadow-inner' : 'border-slate-200'
      }`}
    >
      <div className="mb-4 flex items-center justify-between pb-1">
        <h4 className="text-sm font-semibold text-slate-700">{columnTitles[status]}</h4>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{tasks.length}</span>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="space-y-3 min-h-[120px] flex-1">
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onSelect={onSelectTask}
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
              isDragging={draggedTaskId === task.id}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onAddTask(status)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 export-hide"
        >
          <PlusIcon /> Tilføj opgave
        </button>
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = (props) => {
  const [draggedOverColumn, setDraggedOverColumn] = useState<KanbanStatus | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const isEmpty = props.tasks.length === 0;

  const handleDrop = (event: React.DragEvent, status: KanbanStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('application/task-id');
    if (taskId) {
      const currentTask = props.tasks.find((task) => task.id === taskId);
      if (currentTask && currentTask.status !== status) {
        props.onMoveTask(taskId, status);
      }
    }
    setDraggedOverColumn(null);
    setDraggedTaskId(null);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Opgavestyring</h3>
        {props.headerActions}
      </div>
      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-16 text-center text-sm text-slate-500">
          Ingen opgaver på tavlen. Klik på “Tilføj opgave” for at starte.
          <div className="mt-4">
            <button
              type="button"
              onClick={() => props.onAddTask('todo')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
            >
              <PlusIcon /> Tilføj opgave
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          {(['todo', 'doing', 'done'] as KanbanStatus[]).map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={props.tasks.filter((task) => task.status === status)}
              onAddTask={props.onAddTask}
              onUpdateTask={props.onUpdateTask}
              onDeleteTask={props.onDeleteTask}
              onDrop={handleDrop}
              isDraggedOver={draggedOverColumn === status}
              onDragEnter={() => setDraggedOverColumn(status)}
              onDragLeave={() => setDraggedOverColumn(null)}
              onSelectTask={props.onSelectTask}
              onDragStartCard={(taskId) => setDraggedTaskId(taskId)}
              onDragEndCard={() => setDraggedTaskId(null)}
              draggedTaskId={draggedTaskId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;

