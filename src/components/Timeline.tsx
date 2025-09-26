import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { Phase, Milestone, Deliverable } from '../types.ts';
import { EditableField } from './EditableField.tsx';
import { CalendarIcon } from './Icons.tsx';

interface TimelineProps {
  projectStartDate: string;
  projectEndDate: string;
  phases: Phase[];
  milestones: Milestone[];
  deliverables: Deliverable[];
  calculateDateFromPosition: (pos: number) => string;
  calculatePositionFromDate: (date: string) => number;
  monthMarkers: { position: number; label: string }[];
  todayPosition: number | null;
  addTimelineItem: (type: 'phase' | 'milestone' | 'deliverable', position: number) => void;
  updateTimelineItem: (type: 'phase' | 'milestone' | 'deliverable', id: string, updates: Partial<Phase | Milestone | Deliverable>) => void;
  deleteTimelineItem: (type: 'phase' | 'milestone' | 'deliverable', id: string) => void;
}

const phaseColors: Record<string, { bg: string; border: string }> = {
    blue: { bg: 'bg-blue-200', border: 'border-blue-500' },
    green: { bg: 'bg-green-200', border: 'border-green-500' },
    yellow: { bg: 'bg-yellow-200', border: 'border-yellow-500' },
    purple: { bg: 'bg-purple-200', border: 'border-purple-500' },
    red: { bg: 'bg-red-200', border: 'border-red-500' },
};

export const Timeline: React.FC<TimelineProps> = (props) => {
  const { 
    phases, milestones, deliverables, calculateDateFromPosition, calculatePositionFromDate, monthMarkers, todayPosition,
    addTimelineItem, updateTimelineItem, deleteTimelineItem
  } = props;
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const deliverableRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [deliverableLayouts, setDeliverableLayouts] = useState<Record<string, { lane: number }>>({});
  const [editingItem, setEditingItem] = useState<{ type: 'phase' | 'milestone' | 'deliverable'; id: string } | null>(null);
  const [editingColorPhaseId, setEditingColorPhaseId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const timelineEl = timelineRef.current;
    if (!timelineEl || deliverables.length === 0) return;

    const calculateLayout = () => {
        const timelineWidth = timelineEl.getBoundingClientRect().width;
        if (timelineWidth === 0) return;

        const measuredItems = deliverables.map(d => {
            const el = deliverableRefs.current[d.id];
            const width = el ? el.getBoundingClientRect().width : 120; // Default width estimate
            return {
                id: d.id,
                position: d.position,
                widthPercent: (width / timelineWidth) * 100,
            };
        }).sort((a, b) => a.position - b.position);

        const NUM_LANES = 4;
        const lanesEndPosition: number[] = Array(NUM_LANES).fill(-Infinity);
        const newLayouts: Record<string, { lane: number }> = {};
        
        for (const item of measuredItems) {
            const itemStartPos = item.position - (item.widthPercent / 2);
            let placed = false;
            for (let i = 0; i < NUM_LANES; i++) {
                if (itemStartPos >= lanesEndPosition[i]) {
                    newLayouts[item.id] = { lane: i };
                    lanesEndPosition[i] = item.position + (item.widthPercent / 2) + 1; // 1% buffer
                    placed = true;
                    break;
                }
            }
             if (!placed) {
                const earliestLane = lanesEndPosition.reduce((minIndex, currentEnd, currentIndex, arr) => currentEnd < arr[minIndex] ? currentIndex : minIndex, 0);
                newLayouts[item.id] = { lane: earliestLane };
                lanesEndPosition[earliestLane] = item.position + (item.widthPercent / 2) + 1;
            }
        }

        if (JSON.stringify(deliverableLayouts) !== JSON.stringify(newLayouts)) {
            setDeliverableLayouts(newLayouts);
        }
    };
    
    calculateLayout();

    const resizeObserver = new ResizeObserver(calculateLayout);
    resizeObserver.observe(timelineEl);

    return () => resizeObserver.disconnect();
  }, [deliverables, deliverableLayouts]);


  const handleAddItem = (type: 'phase' | 'milestone' | 'deliverable') => {
    addTimelineItem(type, 45); // Add near center, easier to grab
  };

  const [draggedItem, setDraggedItem] = useState<{type: 'phase' | 'milestone' | 'deliverable', id: string, mode: 'move' | 'resize-end', initialX: number, initialPos: number, initialWidth?: number} | null>(null);

  const handleDragStart = (e: React.MouseEvent, type: 'phase' | 'milestone' | 'deliverable', id: string, mode: 'move' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    
    let item: Phase | Milestone | Deliverable | undefined;
    if (type === 'phase') item = phases.find(i => i.id === id);
    else if (type === 'milestone') item = milestones.find(i => i.id === id);
    else item = deliverables.find(i => i.id === id);

    if (!item) return;

    const initialPos = 'position' in item ? item.position : (item as Phase).start;
    const initialWidth = 'end' in item ? (item as Phase).end - (item as Phase).start : undefined;

    setDraggedItem({ type, id, mode, initialX: e.clientX, initialPos, initialWidth });
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedItem || !timelineRef.current) return;
    
    const { type, id, mode, initialX, initialPos, initialWidth } = draggedItem;
    const rect = timelineRef.current.getBoundingClientRect();
    if (rect.width === 0) return;

    const dx = e.clientX - initialX;
    const dPos = (dx / rect.width) * 100;

    if (mode === 'move') {
        const newPos = Math.max(0, initialPos + dPos);
        if (type === 'phase' && initialWidth !== undefined) {
            updateTimelineItem(type, id, { start: Math.min(newPos, 100 - initialWidth), end: Math.min(newPos + initialWidth, 100) });
        } else {
            updateTimelineItem(type, id, { position: Math.min(newPos, 100) });
        }
    } else if (mode === 'resize-end' && type === 'phase' && initialWidth !== undefined) {
        const newWidth = Math.max(1, initialWidth + dPos);
        updateTimelineItem(type, id, { end: Math.min(initialPos + newWidth, 100) });
    }
  }, [draggedItem, updateTimelineItem]);

  const handleMouseUp = useCallback(() => {
    setDraggedItem(null);
  }, []);

  useEffect(() => {
    if (draggedItem) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedItem, handleMouseMove, handleMouseUp]);
  
  const DateEditor = ({ item, type }: { item: Phase | Milestone | Deliverable; type: 'phase' | 'milestone' | 'deliverable' }) => {
    const isPhase = type === 'phase' && 'start' in item;

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end' | 'position') => {
      const newPosition = calculatePositionFromDate(e.target.value);
      if (field === 'start' && 'end' in item) {
        updateTimelineItem(type, item.id, { [field]: newPosition, end: Math.max(newPosition, item.end) });
      } else if (field === 'end' && 'start' in item) {
        updateTimelineItem(type, item.id, { [field]: newPosition, start: Math.min(newPosition, item.start) });
      } else {
        updateTimelineItem(type, item.id, { [field]: newPosition });
      }
    };

    return (
      <div className="absolute z-30 bg-white p-3 rounded-lg shadow-lg -translate-x-1/2 left-1/2 top-full mt-2" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-bold mb-2 text-slate-700 truncate max-w-[200px]">{item.text}</p>
        <div className="space-y-2">
            {isPhase ? (
            <>
                <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Start</label>
                    <input type="date" value={calculateDateFromPosition((item as Phase).start)} onChange={e => handleDateChange(e, 'start')} className="text-sm p-1 border border-slate-300 rounded w-full bg-white text-slate-800" style={{ colorScheme: 'light' }} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Slut</label>
                    <input type="date" value={calculateDateFromPosition((item as Phase).end)} onChange={e => handleDateChange(e, 'end')} className="text-sm p-1 border border-slate-300 rounded w-full bg-white text-slate-800" style={{ colorScheme: 'light' }} />
                </div>
            </>
            ) : (
             <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Dato</label>
                <input type="date" value={calculateDateFromPosition((item as Milestone | Deliverable).position)} onChange={e => handleDateChange(e, 'position')} className="text-sm p-1 border border-slate-300 rounded w-full bg-white text-slate-800" style={{ colorScheme: 'light' }} />
            </div>
            )}
        </div>
        <button onClick={() => setEditingItem(null)} className="mt-3 w-full text-xs bg-slate-200 py-1 rounded hover:bg-slate-300">Luk</button>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm" onClick={() => { setEditingItem(null); setEditingColorPhaseId(null); }}>
      <h3 className="text-lg font-bold mb-4 text-slate-700">Tidslinje</h3>
      
      <div className="relative w-full h-96 select-none" ref={timelineRef}>
        {/* Background grid and month markers */}
        <div className="absolute inset-0 flex border-y border-slate-200">
          {monthMarkers.map((marker, index) => (
            <div key={index} className="h-full border-r border-slate-200/70" style={{ position: 'absolute', left: `${marker.position}%` }}>
              <span className="text-xs text-slate-400 absolute -top-4 left-1">{marker.label}</span>
            </div>
          ))}
        </div>
        
        {/* Today Marker */}
        {todayPosition !== null && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: `${todayPosition}%` }}>
            <div className="absolute -top-5 -translate-x-1/2 text-xs font-bold text-red-500 bg-white px-1 rounded whitespace-nowrap">I dag</div>
          </div>
        )}

        <div className="absolute w-full h-full pt-8">
          {/* Milestones */}
          <div className="relative h-20">
            {milestones.map(m => (
              <div 
                key={m.id} 
                className="absolute group cursor-move z-10" 
                style={{ left: `${m.position}%`, bottom: '0.5rem' }}
                onMouseDown={(e) => handleDragStart(e, 'milestone', m.id, 'move')}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex flex-col items-center -translate-x-1/2 timeline-item-centered">
                    <div className="bg-white px-2 py-1 rounded-md shadow text-xs whitespace-nowrap mb-2">
                        <EditableField initialValue={m.text} onSave={(text) => updateTimelineItem('milestone', m.id, { text })} className="!p-0" />
                    </div>
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[9px] border-b-purple-500" title={calculateDateFromPosition(m.position)}></div>
                    <div className="w-px h-6 bg-purple-500"></div>
                </div>
                 <div className="absolute bottom-6 left-full ml-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity export-hide">
                    <button onClick={() => setEditingItem({ type: 'milestone', id: m.id })} className="z-20 w-5 h-5 bg-white text-slate-600 rounded-full grid place-items-center shadow hover:bg-slate-100"><CalendarIcon/></button>
                    <button onClick={() => deleteTimelineItem('milestone', m.id)} className="z-20 w-5 h-5 bg-red-500 text-white rounded-full grid place-items-center shadow text-xs hover:bg-red-600">X</button>
                </div>
                {editingItem?.type === 'milestone' && editingItem.id === m.id && <DateEditor item={m} type="milestone" />}
              </div>
            ))}
          </div>

          {/* Phases */}
          <div className="relative h-12 my-2">
            {phases.map(phase => {
              const color = phaseColors[phase.highlight] || phaseColors.blue;
              return (
                <div
                  key={phase.id}
                  className="relative"
                  style={{ position: 'absolute', left: `${phase.start}%`, width: `${phase.end - phase.start}%`, height: '100%' }}
                   onClick={e => e.stopPropagation()}
                >
                    <div
                      className={`h-8 rounded ${color.bg} border-l-4 ${color.border} flex items-center px-2 group cursor-move z-10 absolute top-1/2 -translate-y-1/2 w-full timeline-phase-bar`}
                      onMouseDown={(e) => handleDragStart(e, 'phase', phase.id, 'move')}
                      title={`${phase.text} (${calculateDateFromPosition(phase.start)} - ${calculateDateFromPosition(phase.end)})`}
                    >
                      <div className="flex-grow w-full overflow-hidden whitespace-nowrap">
                        <EditableField initialValue={phase.text} onSave={(text) => updateTimelineItem('phase', phase.id, { text })} className="text-sm font-semibold !p-0 bg-transparent truncate" />
                      </div>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity export-hide">
                        <button onClick={() => setEditingColorPhaseId(phase.id)} className={`z-20 w-5 h-5 rounded-full grid place-items-center shadow hover:opacity-80 ${color.bg} border-2 border-white`}></button>
                        <button onClick={() => setEditingItem({ type: 'phase', id: phase.id })} className="z-20 w-5 h-5 bg-white text-slate-600 rounded-full grid place-items-center shadow hover:bg-slate-100"><CalendarIcon /></button>
                        <button onClick={() => deleteTimelineItem('phase', phase.id)} className="z-20 w-5 h-5 bg-red-500 text-white rounded-full grid place-items-center shadow hover:bg-red-600 text-xs">X</button>
                      </div>
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 export-hide"
                        onMouseDown={(e) => handleDragStart(e, 'phase', phase.id, 'resize-end')}
                      />
                    </div>
                    {editingColorPhaseId === phase.id && (
                        <div className="absolute z-30 bg-white p-2 rounded-lg shadow-lg top-full mt-2 left-1/2 -translate-x-1/2 flex gap-2" onClick={e => e.stopPropagation()}>
                            {Object.entries(phaseColors).map(([key, value]) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        updateTimelineItem('phase', phase.id, { highlight: key });
                                        setEditingColorPhaseId(null);
                                    }}
                                    className={`w-6 h-6 rounded-full ${value.bg} border-2 ${phase.highlight === key ? value.border : 'border-transparent'} hover:scale-110 transition-transform`}
                                    title={key}
                                />
                            ))}
                        </div>
                    )}
                    {editingItem?.type === 'phase' && editingItem.id === phase.id && <DateEditor item={phase} type="phase" />}
                </div>
              );
            })}
          </div>

          {/* Deliverables */}
          <div className="relative h-28">
              {deliverables.map((d, index) => {
                  const layout = deliverableLayouts[d.id];
                  const laneIndex = layout ? layout.lane : index % 2;
                  const topRem = 0.5 + (laneIndex * 2);
                  const lineHeightRem = 1.5 + topRem;

                  return (
                      <div 
                          key={d.id} 
                          ref={el => { deliverableRefs.current[d.id] = el; }}
                          className="absolute group cursor-move z-10 transition-all duration-300" 
                          style={{ left: `${d.position}%`, top: `${topRem}rem` }}
                          onMouseDown={(e) => handleDragStart(e, 'deliverable', d.id, 'move')}
                          onClick={e => e.stopPropagation()}
                      >
                          <div className="flex flex-col items-center -translate-x-1/2 timeline-item-centered">
                              <div className="absolute bottom-full w-px bg-teal-400 border-l border-dashed border-teal-400 -z-10" style={{ height: `${lineHeightRem}rem` }}></div>
                              <div className="w-3 h-3 bg-teal-500 rounded-full ring-4 ring-white" title={calculateDateFromPosition(d.position)}></div>
                              <div className="bg-white px-3 py-2 rounded-md shadow text-xs leading-snug mt-2 max-w-[14rem] min-h-[3rem] text-center whitespace-normal break-words flex items-center justify-center">
                                  <EditableField initialValue={d.text} onSave={(text) => updateTimelineItem('deliverable', d.id, { text })} className="!p-0" />
                              </div>
                          </div>
                          <div className="absolute top-0 left-full ml-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity export-hide">
                                <button onClick={() => setEditingItem({ type: 'deliverable', id: d.id })} className="z-20 w-5 h-5 bg-white text-slate-600 rounded-full grid place-items-center shadow hover:bg-slate-100"><CalendarIcon/></button>
                                <button onClick={() => deleteTimelineItem('deliverable', d.id)} className="z-20 w-5 h-5 bg-red-500 text-white rounded-full grid place-items-center shadow text-xs hover:bg-red-600">X</button>
                          </div>
                          {editingItem?.type === 'deliverable' && editingItem.id === d.id && <DateEditor item={d} type="deliverable" />}
                      </div>
                  );
              })}
          </div>
        </div>
      </div>
      
       <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-center gap-4 export-hide">
        <span className="text-sm font-semibold text-slate-600">Tilføj til tidslinje:</span>
        <button onClick={() => handleAddItem('phase')} className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200">Fase</button>
        <button onClick={() => handleAddItem('milestone')} className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full hover:bg-purple-200">Milepæl</button>
        <button onClick={() => handleAddItem('deliverable')} className="text-sm bg-teal-100 text-teal-800 px-3 py-1 rounded-full hover:bg-teal-200">Leverance</button>
      </div>
    </div>
  );
};

