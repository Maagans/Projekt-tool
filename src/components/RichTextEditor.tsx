import React, { useMemo, useState } from 'react';
import { ListItem } from '../types';
import {
  ArrowRightCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  WarningTriangleIcon,
} from './Icons';
import { InlineRichEditor, sanitizeRichText } from './RichTextInlineEditor';

type EditableListColor = 'green' | 'red' | 'blue';

interface EditableListProps {
  title: string;
  items: ListItem[];
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, content: string) => void;
  onReorderItems: (sourceIndex: number, destinationIndex: number) => void;
  colorScheme?: EditableListColor;
  icon?: React.ReactNode;
}

const COLOR_SCHEMES: Record<
  EditableListColor,
  {
    icon: React.ReactNode;
    iconWrapper: string;
    accent: string;
    dragRing: string;
    dragBg: string;
    buttonText: string;
    buttonHover: string;
  }
> = {
  green: {
    icon: <CheckCircleIcon />,
    iconWrapper: 'bg-emerald-50 text-emerald-600',
    accent: 'text-emerald-600',
    dragRing: 'ring-2 ring-emerald-200',
    dragBg: 'bg-emerald-50/70',
    buttonText: 'text-emerald-600',
    buttonHover: 'hover:bg-emerald-50',
  },
  red: {
    icon: <WarningTriangleIcon />,
    iconWrapper: 'bg-rose-50 text-rose-600',
    accent: 'text-rose-600',
    dragRing: 'ring-2 ring-rose-200',
    dragBg: 'bg-rose-50/70',
    buttonText: 'text-rose-600',
    buttonHover: 'hover:bg-rose-50',
  },
  blue: {
    icon: <ArrowRightCircleIcon />,
    iconWrapper: 'bg-blue-50 text-blue-600',
    accent: 'text-blue-600',
    dragRing: 'ring-2 ring-blue-200',
    dragBg: 'bg-blue-50/70',
    buttonText: 'text-blue-600',
    buttonHover: 'hover:bg-blue-50',
  },
};

type ColorSchemeConfig = (typeof COLOR_SCHEMES)[EditableListColor];

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
  colorConfig: ColorSchemeConfig;
}> = ({
  item,
  index,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
  isDragOver,
  colorConfig,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const sanitizedContent = useMemo(() => sanitizeRichText(item.content ?? ''), [item.content]);

  return (
    <li
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`group relative flex items-start gap-3 rounded-2xl border border-transparent bg-slate-50/80 px-3 py-2 transition-all duration-200 ${
        isDragging ? colorConfig.dragBg : ''
      } ${isDragOver ? colorConfig.dragRing : ''}`}
    >
      <div className="cursor-grab pt-1.5 text-slate-300 hover:text-slate-500 export-hide" title="Træk for at sortere">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </div>
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-slate-700">
        {isEditing ? (
          <InlineRichEditor
            initialValue={sanitizedContent}
            onSave={(value) => {
              onUpdate(value);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div
            className="rounded-2xl border border-transparent px-3 py-2 hover:border-slate-200"
            onClick={() => setIsEditing(true)}
          >
            <div
              className="prose prose-sm max-w-none break-words text-slate-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              dangerouslySetInnerHTML={{
                __html: sanitizedContent || '<p class="text-slate-400">Klik for at tilføje detaljer</p>',
              }}
            />
          </div>
        )}
      </div>
      <button
        onClick={onDelete}
        className="export-hide grid h-7 w-7 flex-shrink-0 place-items-center text-slate-400 transition hover:text-rose-500"
      >
        <TrashIcon />
      </button>
    </li>
  );
};

export const EditableList: React.FC<EditableListProps> = ({
  title,
  items = [],
  onAddItem,
  onDeleteItem,
  onUpdateItem,
  onReorderItems,
  colorScheme = 'blue',
  icon,
}) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const colorConfig = useMemo<ColorSchemeConfig>(
    () => COLOR_SCHEMES[colorScheme] ?? COLOR_SCHEMES.blue,
    [colorScheme],
  );
  const headerIcon = icon ?? colorConfig.icon;

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
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className={`rounded-full p-2 ${colorConfig.iconWrapper}`}>{headerIcon}</div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          {items.length > 0 ? (
            <ul className="space-y-3">
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
                  colorConfig={colorConfig}
                />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">Ingen punkter tilføjet endnu.</p>
          )}
        </div>
        <button
          onClick={onAddItem}
          className={`export-hide mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold ${colorConfig.buttonText} ${colorConfig.buttonHover}`}
        >
          <PlusIcon /> Tilføj punkt
        </button>
      </div>
    </div>
  );
};

