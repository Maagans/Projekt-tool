import React, { useState } from 'react';
import { KanbanTask } from '../types.ts';
import { PlusIcon, TrashIcon } from './Icons.tsx';
import { EditableField } from './EditableField.tsx';

type KanbanStatus = 'todo' | 'doing' | 'done';

const columnTitles: Record<KanbanStatus, string> = {
  todo: 'To Do',
  doing: 'I gang',
  done: 'Gennemført'
};

const columnStyles: Record<KanbanStatus, string> = {
  todo: 'bg-blue-50 border-blue-200',
  doing: 'bg-purple-50 border-purple-200',
  done: 'bg-green-50 border-green-200'
};

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onAddTask: (status: KanbanStatus) => void;
  onUpdateTask: (id: string, content: string) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (id: string, newStatus: KanbanStatus) => void;
}

const KanbanCard: React.FC<{
  task: KanbanTask;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}> = ({ task, onUpdate, onDelete }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/task-id', task.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-white p-2 rounded-md shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-grow text-sm kanban-card-content">
          <EditableField initialValue={task.content} onSave={(newContent) => onUpdate(task.id, newContent)} isTextArea />
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="w-7 h-7 grid place-items-center flex-shrink-0 text-slate-400 hover:text-red-500 export-hide"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

const KanbanColumn: React.FC<{
  status: KanbanStatus;
  tasks: KanbanTask[];
  onAddTask: (status: KanbanStatus) => void;
  onUpdateTask: (id: string, content: string) => void;
  onDeleteTask: (id: string) => void;
  onDrop: (e: React.DragEvent, status: KanbanStatus) => void;
  isDraggedOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
}> = (props) => {
  const { status, tasks, onAddTask, onUpdateTask, onDeleteTask, onDrop, isDraggedOver, onDragEnter, onDragLeave } = props;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
      className={`flex-1 p-3 rounded-lg border-2 border-dashed ${columnStyles[status]} transition-colors ${isDraggedOver ? 'bg-opacity-50 border-blue-500' : ''}`}
    >
      <h4 className="font-bold text-slate-700 mb-3">{columnTitles[status]}</h4>
      <div className="space-y-3 min-h-[100px]">
        {tasks.map(task => (
          <KanbanCard key={task.id} task={task} onUpdate={onUpdateTask} onDelete={onDeleteTask} />
        ))}
      </div>
      <button
        onClick={() => onAddTask(status)}
        className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-blue-600 hover:bg-blue-100 p-2 rounded-md transition-colors export-hide"
      >
        <PlusIcon /> Tilføj opgave
      </button>
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = (props) => {
  const [draggedOverColumn, setDraggedOverColumn] = useState<KanbanStatus | null>(null);

  const handleDrop = (e: React.DragEvent, status: KanbanStatus) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('application/task-id');
      if (taskId) {
        const currentTask = props.tasks.find((t) => t.id === taskId);
        if (currentTask && currentTask.status !== status) {
          props.onMoveTask(taskId, status);
        }
      }
      setDraggedOverColumn(null);
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-bold mb-4 text-slate-700">Opgavestyring</h3>
      <div className="flex flex-col lg:flex-row gap-4">
        {(['todo', 'doing', 'done'] as KanbanStatus[]).map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={props.tasks.filter(t => t.status === status)}
            onAddTask={props.onAddTask}
            onUpdateTask={props.onUpdateTask}
            onDeleteTask={props.onDeleteTask}
            onDrop={handleDrop}
            isDraggedOver={draggedOverColumn === status}
            onDragEnter={() => setDraggedOverColumn(status)}
            onDragLeave={() => setDraggedOverColumn(null)}
          />
        ))}
      </div>
    </div>
  );
};