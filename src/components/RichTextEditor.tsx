import React, { useState } from 'react';
import { ListItem } from '../types';
import { EditableField } from './EditableField';
import { PlusIcon, TrashIcon } from './Icons';

interface EditableListProps {
  title: string;
  items: ListItem[];
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, content: string) => void;
  onReorderItems: (sourceIndex: number, destinationIndex: number) => void;
}

const DraggableListItem: React.FC<{
  item: ListItem;
  index: number;
  onUpdate: (content: string) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnter: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
  isDragOver: boolean;
}> = ({ item, index, onUpdate, onDelete, onDragStart, onDragEnter, onDragEnd, isDragging, isDragOver }) => {
  return (
    <li
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`group flex items-start gap-2 p-2 rounded-md transition-all duration-200 ${isDragging ? 'opacity-50 bg-blue-100' : 'bg-slate-50'} ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
    >
      <div className="cursor-grab text-slate-400 hover:text-slate-600 pt-1.5 export-hide" title="TrÃ¦k for at sortere">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
      </div>
      <div className="flex-grow">
        <EditableField initialValue={item.content} onSave={onUpdate} isTextArea />
      </div>
      <button onClick={onDelete} className="w-7 h-7 grid place-items-center flex-shrink-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity export-hide">
        <TrashIcon />
      </button>
    </li>
  );
};


export const EditableList: React.FC<EditableListProps> = ({ title, items = [], onAddItem, onDeleteItem, onUpdateItem, onReorderItems }) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex !== null && draggedItemIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItemIndex !== null && dragOverIndex !== null && draggedItemIndex !== dragOverIndex) {
      onReorderItems(draggedItemIndex, dragOverIndex);
    }
    setDraggedItemIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col">
      <h3 className="text-lg font-bold mb-3 text-slate-700">{title}</h3>
      <div className="flex-grow">
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <DraggableListItem
                key={item.id}
                item={item}
                index={index}
                onUpdate={(content) => onUpdateItem(item.id, content)}
                onDelete={() => onDeleteItem(item.id)}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragEnd={handleDragEnd}
                isDragging={draggedItemIndex === index}
                isDragOver={dragOverIndex === index}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">Ingen punkter tilfÃ¸jet.</p>
        )}
      </div>
      <button
        onClick={onAddItem}
        className="mt-4 w-full flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:bg-blue-100 p-2 rounded-md transition-colors export-hide"
      >
        <PlusIcon /> TilfÃ¸j punkt
      </button>
    </div>
  );
};


