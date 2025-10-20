import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
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

type TimelineZoom = 'year' | 'quarter' | 'month';

const ZOOM_LEVELS: Record<TimelineZoom, { label: string; scale: number }> = {
  year: { label: 'År', scale: 1 },
  quarter: { label: 'Kvartal', scale: 1.4 },
  month: { label: 'Måned', scale: 2 },
};

const ZOOM_SEQUENCE: TimelineZoom[] = ['year', 'quarter', 'month'];
const daLocale: Intl.LocalesArgument = 'da-DK';

const getIsoWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const startOfIsoWeek = (date: Date): Date => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const phaseColors: Record<string, { bg: string; border: string }> = {
    blue: { bg: 'bg-blue-200', border: 'border-blue-500' },
    green: { bg: 'bg-green-200', border: 'border-green-500' },
    yellow: { bg: 'bg-yellow-200', border: 'border-yellow-500' },
    purple: { bg: 'bg-purple-200', border: 'border-purple-500' },
    red: { bg: 'bg-red-200', border: 'border-red-500' },
};

export const Timeline: React.FC<TimelineProps> = (props) => {
  const {
    projectStartDate, projectEndDate,
    phases, milestones, deliverables, calculateDateFromPosition, calculatePositionFromDate, monthMarkers, todayPosition,
    addTimelineItem, updateTimelineItem, deleteTimelineItem
  } = props;
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollRatioRef = useRef<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<TimelineZoom>('quarter');
  const zoomScale = ZOOM_LEVELS[zoomLevel].scale;
  const deliverableRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [deliverableLayouts, setDeliverableLayouts] = useState<Record<string, { lane: number }>>({});
  const [editingItem, setEditingItem] = useState<{ type: 'phase' | 'milestone' | 'deliverable'; id: string } | null>(null);
  const [hoveredDeliverableId, setHoveredDeliverableId] = useState<string | null>(null);
  const deliverableLaneSpacingRem = 4.25;
  const deliverableTopOffsetRem = 1.25;

  const deliverableSectionHeightRem = useMemo(() => {
    const laneValues = Object.values(deliverableLayouts).map((layout) => layout.lane);
    const laneCount = laneValues.length > 0 ? Math.max(...laneValues) + 1 : (deliverables.length > 0 ? 1 : 0);
    if (laneCount === 0) {
      return 10;
    }
    const highestTop = deliverableTopOffsetRem + (laneCount - 1) * deliverableLaneSpacingRem;
    const cardAllowance = 9;
    return highestTop + cardAllowance;
  }, [deliverableLayouts, deliverables]);

  const [editingColorPhaseId, setEditingColorPhaseId] = useState<string | null>(null);
  const projectStartMs = useMemo(() => {
    const timestamp = new Date(projectStartDate).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }, [projectStartDate]);

  const projectEndMs = useMemo(() => {
    const timestamp = new Date(projectEndDate).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }, [projectEndDate]);

  const projectDurationMs = useMemo(() => {
    if (projectStartMs === null || projectEndMs === null) {
      return null;
    }
    return projectEndMs - projectStartMs;
  }, [projectStartMs, projectEndMs]);

  const getPositionForDate = useCallback((date: Date) => {
    if (projectStartMs === null || projectDurationMs === null || projectDurationMs <= 0) {
      return null;
    }
    const ratio = (date.getTime() - projectStartMs) / projectDurationMs;
    if (!Number.isFinite(ratio)) {
      return null;
    }
    return Math.max(0, Math.min(100, ratio * 100));
  }, [projectStartMs, projectDurationMs]);

  const monthlyMarkersDetailed = useMemo(() => {
    const markers = monthMarkers.map((marker) => {
      const iso = calculateDateFromPosition(marker.position);
      const parsed = new Date(iso);
      if (Number.isNaN(parsed.getTime())) {
        return { position: marker.position, date: undefined as Date | undefined, fallbackLabel: marker.label };
      }
      const normalized = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      normalized.setHours(0, 0, 0, 0);
      return { position: marker.position, date: normalized, fallbackLabel: marker.label };
    });

    if (projectStartMs !== null && !markers.some((marker) => Math.abs(marker.position) < 0.001)) {
      const startDateObj = new Date(projectStartMs);
      startDateObj.setHours(0, 0, 0, 0);
      markers.push({
        position: 0,
        date: startDateObj,
        fallbackLabel: startDateObj.toLocaleDateString(daLocale, { month: 'short', year: '2-digit' }),
      });
    }

    return markers.sort((a, b) => a.position - b.position);
  }, [monthMarkers, calculateDateFromPosition, projectStartMs]);

  const quarterMarkers = useMemo(() => {
    if (projectStartMs === null || projectEndMs === null || projectDurationMs === null || projectDurationMs <= 0) {
      return [] as { position: number; label: string; date: Date }[];
    }
    const startDate = new Date(projectStartMs);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(projectEndMs);
    endDate.setHours(0, 0, 0, 0);

    const markers: { position: number; label: string; date: Date }[] = [];
    const pushMarker = (date: Date) => {
      const pos = getPositionForDate(date);
      if (pos === null || pos < 0 || pos > 100) {
        return;
      }
      markers.push({
        position: pos,
        label: `Kv ${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`,
        date: new Date(date),
      });
    };

    pushMarker(startDate);

    const current = new Date(startDate.getFullYear(), Math.floor(startDate.getMonth() / 3) * 3, 1);
    if (current <= startDate) {
      current.setMonth(current.getMonth() + 3);
    }

    while (current <= endDate) {
      pushMarker(new Date(current));
      current.setMonth(current.getMonth() + 3);
    }

    return markers;
  }, [projectStartMs, projectEndMs, projectDurationMs, getPositionForDate]);

  const weekMarkers = useMemo(() => {
    if (projectStartMs === null || projectEndMs === null || projectDurationMs === null || projectDurationMs <= 0) {
      return [] as { position: number; label: string; date: Date }[];
    }
    const startDate = new Date(projectStartMs);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(projectEndMs);
    endDate.setHours(0, 0, 0, 0);

    const markers: { position: number; label: string; date: Date }[] = [{
      position: 0,
      label: `${getIsoWeek(startDate)}`,
      date: new Date(startDate),
    }];

    const current = startOfIsoWeek(startDate);
    if (current <= startDate) {
      current.setDate(current.getDate() + 7);
    }
    while (current <= endDate) {
      const pos = getPositionForDate(current);
      if (pos !== null && pos >= 0 && pos <= 100) {
        markers.push({
          position: pos,
          label: `${getIsoWeek(current)}`,
          date: new Date(current),
        });
      }
      current.setDate(current.getDate() + 7);
    }

    return markers;
  }, [projectStartMs, projectEndMs, projectDurationMs, getPositionForDate]);

  const majorMarkers = useMemo(() => {
    if (zoomLevel === 'quarter') {
      return quarterMarkers.map(({ position, label }) => ({ position, label }));
    }
    return monthlyMarkersDetailed.map((marker) => {
      if (marker.date) {
        return {
          position: marker.position,
          label: marker.date.toLocaleDateString(daLocale, { month: 'short', year: 'numeric' }),
        };
      }
      return { position: marker.position, label: marker.fallbackLabel };
    });
  }, [quarterMarkers, monthlyMarkersDetailed, zoomLevel]);

  const detailMarkers = useMemo(() => {
    if (zoomLevel === 'quarter') {
      return monthlyMarkersDetailed
        .filter((marker) => !quarterMarkers.some(({ position }) => Math.abs(position - marker.position) < 0.05))
        .map((marker) => ({
          position: marker.position,
          label: marker.date
            ? marker.date.toLocaleDateString(daLocale, { month: 'short' })
            : marker.fallbackLabel,
        }));
    }
    if (zoomLevel === 'month') {
      return weekMarkers.map((marker) => ({
        position: marker.position,
        label: marker.date ? `${getIsoWeek(marker.date)}` : marker.label,
      }));
    }
    return [] as { position: number; label: string }[];
  }, [zoomLevel, monthlyMarkersDetailed, quarterMarkers, weekMarkers]);


  const rememberScrollCenter = useCallback(() => {
    const container = scrollContainerRef.current;
    const timeline = timelineRef.current;
    if (!container || !timeline) {
      return null;
    }
    const width = timeline.offsetWidth;
    if (width === 0) {
      return null;
    }
    const center = container.scrollLeft + container.clientWidth / 2;
    return center / width;
  }, []);

  const applyPendingScrollCenter = useCallback(() => {
    if (pendingScrollRatioRef.current === null) {
      return;
    }
    const container = scrollContainerRef.current;
    const timeline = timelineRef.current;
    if (!container || !timeline) {
      pendingScrollRatioRef.current = null;
      return;
    }
    const width = timeline.offsetWidth;
    if (width === 0) {
      pendingScrollRatioRef.current = null;
      return;
    }
    const ratio = pendingScrollRatioRef.current;
    pendingScrollRatioRef.current = null;
    const targetCenter = width * ratio;
    const nextScrollLeft = Math.max(0, targetCenter - container.clientWidth / 2);
    container.scrollLeft = nextScrollLeft;
  }, []);

  const handleZoomChange = useCallback((next: TimelineZoom) => {
    if (next === zoomLevel) {
      return;
    }
    const ratio = rememberScrollCenter();
    if (ratio !== null) {
      pendingScrollRatioRef.current = ratio;
    }
    setZoomLevel(next);
  }, [rememberScrollCenter, zoomLevel]);

  const handleZoomStep = useCallback((direction: 'in' | 'out') => {
    const currentIndex = ZOOM_SEQUENCE.indexOf(zoomLevel);
    if (currentIndex === -1) {
      handleZoomChange('quarter');
      return;
    }
    const nextIndex = direction === 'in'
      ? Math.min(ZOOM_SEQUENCE.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);
    const nextLevel = ZOOM_SEQUENCE[nextIndex];
    handleZoomChange(nextLevel);
  }, [handleZoomChange, zoomLevel]);

  const handleTimelineWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) {
      return;
    }
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      scrollContainerRef.current.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }, []);

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
  }, [deliverables, deliverableLayouts, zoomScale]);

  useLayoutEffect(() => {
    applyPendingScrollCenter();
  }, [zoomScale, applyPendingScrollCenter]);


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

    const toInputValue = (position?: number) => {
      if (position === undefined) {
        return '';
      }
      const isoDate = calculateDateFromPosition(position);
      if (!isoDate) {
        return '';
      }
      return isoDate.slice(0, 10);
    };

    const closeEditor = () => {
      setEditingItem(null);
      setEditingColorPhaseId(null);
    };

    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end' | 'position') => {
      const nextPosition = calculatePositionFromDate(event.target.value);
      if (field === 'start' && 'end' in item) {
        const phase = item as Phase;
        updateTimelineItem(type, item.id, { [field]: nextPosition, end: Math.max(nextPosition, phase.end) });
      } else if (field === 'end' && 'start' in item) {
        const phase = item as Phase;
        updateTimelineItem(type, item.id, { [field]: nextPosition, start: Math.min(nextPosition, phase.start) });
      } else {
        updateTimelineItem(type, item.id, { [field]: nextPosition });
      }
    };

    const startValue = isPhase
      ? toInputValue((item as Phase).start)
      : toInputValue((item as Milestone | Deliverable).position);
    const endValue = isPhase ? toInputValue((item as Phase).end) : '';

    return (
      <div
        className="absolute top-full left-1/2 z-40 mt-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>{type === 'phase' ? 'Opdater periode' : 'Opdater dato'}</span>
          <button
            type="button"
            onClick={closeEditor}
            className="text-slate-400 transition hover:text-slate-600"
            aria-label="Luk dato editor"
          >
            X
          </button>
        </div>
        <div className="flex flex-col gap-3 text-sm text-slate-600">
          {isPhase ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Startdato</span>
                <input
                  type="date"
                  value={startValue}
                  onChange={(event) => handleDateChange(event, 'start')}
                  className="rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Slutdato</span>
                <input
                  type="date"
                  value={endValue}
                  onChange={(event) => handleDateChange(event, 'end')}
                  className="rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none"
                />
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">Dato</span>
              <input
                type="date"
                value={startValue}
                onChange={(event) => handleDateChange(event, 'position')}
                className="rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none"
              />
            </label>
          )}
          <button
            type="button"
            onClick={closeEditor}
            className="mt-1 self-end rounded bg-slate-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Luk
          </button>
        </div>
      </div>
    );
  };

  return (
  <div className="bg-white p-4 rounded-lg shadow-sm" onClick={() => { setEditingItem(null); setEditingColorPhaseId(null); }}>
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h3 className="text-lg font-bold text-slate-700">Tidslinje</h3>
      <div className="flex items-center gap-2 text-sm export-hide">
        <span className="text-slate-500">Zoom:</span>
        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
          <button
            type="button"
            onClick={() => handleZoomStep("out")}
            className="w-7 h-7 rounded-full bg-white text-slate-600 shadow hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={zoomLevel === ZOOM_SEQUENCE[0]}
          >
            -
          </button>
          {ZOOM_SEQUENCE.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleZoomChange(level)}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${zoomLevel === level ? 'bg-slate-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'}`}
              aria-pressed={zoomLevel === level}
            >
              {ZOOM_LEVELS[level].label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleZoomStep("in")}
            className="w-7 h-7 rounded-full bg-white text-slate-600 shadow hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={zoomLevel === ZOOM_SEQUENCE[ZOOM_SEQUENCE.length - 1]}
          >
            +
          </button>
        </div>
      </div>
    </div>

    <div className="relative w-full overflow-hidden" onWheel={handleTimelineWheel}>
      <div className="overflow-x-auto overflow-y-visible" ref={scrollContainerRef}>
        <div
          className="relative h-[32rem] min-w-full select-none pt-12"
          style={{ width: `${Math.max(zoomScale * 100, 100)}%` }}
          ref={timelineRef}
        >
          {/* Background grid and markers */}
          <div className="absolute inset-0 border-y border-slate-200">
            {detailMarkers.map((marker, index) => (
              <div
                key={`detail-${index}`}
                className="pointer-events-none absolute h-full border-r border-slate-200/60"
                style={{ left: `${marker.position}%` }}
              >
                <span className="absolute top-4 left-1/2 -translate-x-1/2 -translate-y-full text-[11px] text-slate-500 whitespace-nowrap bg-white/90 px-1 rounded">{marker.label}</span>
              </div>
            ))}
            {majorMarkers.map((marker, index) => (
              <div
                key={`major-${index}`}
                className="pointer-events-none absolute h-full border-r border-slate-300"
                style={{ left: `${marker.position}%` }}
              >
                <span className="absolute top-10 left-1/2 -translate-x-1/2 -translate-y-full text-xs font-semibold text-slate-600 whitespace-nowrap bg-white/90 px-1 rounded">{marker.label}</span>
              </div>
            ))}
          </div>

          {/* Today Marker */}
          {todayPosition !== null && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: `${todayPosition}%` }}>
              <div className="absolute -top-5 -translate-x-1/2 text-xs font-bold text-red-500 bg-white px-1 rounded whitespace-nowrap">I dag</div>
            </div>
          )}

          <div className="absolute w-full h-full pt-16">
            {/* Milestones */}
            <div className="relative h-20">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="absolute group cursor-move z-10"
                  style={{ left: `${m.position}%`, bottom: "0.5rem" }}
                  onMouseDown={(e) => handleDragStart(e, "milestone", m.id, "move")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-center -translate-x-1/2 timeline-item-centered">
                      <div className="bg-white px-2 py-1 rounded-md shadow text-xs whitespace-nowrap mb-2">
                          <EditableField initialValue={m.text} onSave={(text) => updateTimelineItem("milestone", m.id, { text })} className="!p-0" />
                      </div>
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[9px] border-b-purple-500" title={calculateDateFromPosition(m.position)}></div>
                      <div className="w-px h-6 bg-purple-500"></div>
                  </div>
                   <div className="absolute bottom-6 left-full ml-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity export-hide">
                      <button onClick={() => setEditingItem({ type: "milestone", id: m.id })} className="z-20 w-5 h-5 bg-white text-slate-600 rounded-full grid place-items-center shadow hover:bg-slate-100"><CalendarIcon /></button>
                      <button onClick={() => deleteTimelineItem("milestone", m.id)} className="z-20 w-5 h-5 bg-red-500 text-white rounded-full grid place-items-center shadow text-xs hover:bg-red-600">X</button>
                  </div>
                  {editingItem?.type === "milestone" && editingItem.id === m.id && <DateEditor item={m} type="milestone" />}
                </div>
              ))}
            </div>

            {/* Phases */}
            <div className="relative h-12 my-2">
              {phases.map((phase) => {
                const color = phaseColors[phase.highlight] || phaseColors.blue;
                return (
                  <div
                    key={phase.id}
                    className="relative"
                    style={{ position: "absolute", left: `${phase.start}%`, width: `${phase.end - phase.start}%`, height: "100%" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                      <div
                        className={`h-8 rounded ${color.bg} border-l-4 ${color.border} flex items-center px-2 group cursor-move z-10 absolute top-1/2 -translate-y-1/2 w-full timeline-phase-bar`}
                        onMouseDown={(e) => handleDragStart(e, "phase", phase.id, "move")}
                        title={`${phase.text} (${calculateDateFromPosition(phase.start)} - ${calculateDateFromPosition(phase.end)})`}
                      >
                        <div className="flex-grow w-full overflow-hidden whitespace-nowrap">
                          <EditableField initialValue={phase.text} onSave={(text) => updateTimelineItem("phase", phase.id, { text })} className="text-sm font-semibold !p-0 bg-transparent truncate" />
                        </div>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity export-hide">
                          <button onClick={() => setEditingColorPhaseId(phase.id)} className={`z-20 w-5 h-5 rounded-full grid place-items-center shadow hover:opacity-80 ${color.bg} border-2 border-white`}></button>
                          <button onClick={() => setEditingItem({ type: "phase", id: phase.id })} className="z-20 w-5 h-5 bg-white text-slate-600 rounded-full grid place-items-center shadow hover:bg-slate-100"><CalendarIcon /></button>
                          <button onClick={() => deleteTimelineItem("phase", phase.id)} className="z-20 w-5 h-5 bg-red-500 text-white rounded-full grid place-items-center shadow hover:bg-red-600 text-xs">X</button>
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 export-hide"
                          onMouseDown={(e) => handleDragStart(e, "phase", phase.id, "resize-end")}
                        />
                      </div>
                      {editingColorPhaseId === phase.id && (
                          <div className="absolute z-30 bg-white p-2 rounded-lg shadow-lg top-full mt-2 left-1/2 -translate-x-1/2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                              {Object.entries(phaseColors).map(([key, value]) => (
                                  <button
                                      key={key}
                                      onClick={() => {
                                          updateTimelineItem("phase", phase.id, { highlight: key });
                                          setEditingColorPhaseId(null);
                                      }}
                                      className={`w-6 h-6 rounded-full ${value.bg} border-2 ${phase.highlight === key ? value.border : 'border-transparent'} hover:scale-110 transition-transform`}
                                      title={key}
                                  />
                              ))}
                          </div>
                      )}
                      {editingItem?.type === "phase" && editingItem.id === phase.id && <DateEditor item={phase} type="phase" />}
                  </div>
                );
              })}
            </div>

            {/* Deliverables */}
            <div className="relative" style={{ height: `${deliverableSectionHeightRem}rem` }}>
                {deliverables.map((d, index) => {
                    const layout = deliverableLayouts[d.id];
                    const laneIndex = layout ? layout.lane : index % 2;
                    const topRem = deliverableTopOffsetRem + laneIndex * deliverableLaneSpacingRem;
                    const lineHeightRem = topRem + 3;
                    const isHovered = hoveredDeliverableId === d.id;
                    const deliverableDateIso = calculateDateFromPosition(d.position);
                    const deliverableDate = (() => {
                        const parsed = new Date(deliverableDateIso);
                        return Number.isNaN(parsed.getTime())
                          ? deliverableDateIso
                          : parsed.toLocaleDateString(daLocale, { day: 'numeric', month: 'short', year: 'numeric' });
                    })();

                    return (
                        <div
                            key={d.id}
                            ref={(el) => { deliverableRefs.current[d.id] = el; }}
                            className={`absolute group cursor-move transition-all duration-300 ${isHovered ? 'z-30 scale-[1.02]' : 'z-10'}`}
                            style={{ left: `${d.position}%`, top: `${topRem}rem` }}
                            onMouseDown={(e) => handleDragStart(e, "deliverable", d.id, "move")}
                            onMouseEnter={() => setHoveredDeliverableId(d.id)}
                            onMouseLeave={() => setHoveredDeliverableId((current) => (current === d.id ? null : current))}
                            onClick={(e) => e.stopPropagation()}
                            title={deliverableDate}
                        >
                            <div className="flex flex-col items-center -translate-x-1/2 timeline-item-centered">
                                <div
                                    className="absolute bottom-full w-px bg-teal-400 border-l border-dashed border-teal-400 -z-10"
                                    style={{ height: `${lineHeightRem}rem` }}
                                ></div>
                                <div className={`w-3 h-3 rounded-full ring-4 ${isHovered ? 'bg-teal-600 ring-teal-200' : 'bg-teal-500 ring-white'}`}></div>
                                <div
                                    className={`bg-white px-3 py-2 rounded-md shadow text-xs leading-snug mt-2 max-w-[14rem] min-h-[3rem] text-center whitespace-normal break-words flex flex-col items-center gap-1 ${isHovered ? 'ring-2 ring-teal-200 shadow-lg' : ''}`}
                                >
                                    <EditableField
                                        initialValue={d.text}
                                        onSave={(textValue) => updateTimelineItem("deliverable", d.id, { text: textValue })}
                                        className="!p-0 w-full"
                                        wrapDisplay
                                    />
                                    <div
                                        className={`flex items-center justify-between w-full text-[10px] text-slate-500 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    >
                                        <span className="text-left">{deliverableDate}</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setEditingItem({ type: "deliverable", id: d.id });
                                                }}
                                                className="w-5 h-5 rounded-full bg-white text-slate-600 shadow hover:bg-slate-100 flex items-center justify-center"
                                            >
                                                <CalendarIcon />
                                            </button>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    deleteTimelineItem("deliverable", d.id);
                                                }}
                                                className="w-5 h-5 rounded-full bg-red-500 text-white shadow hover:bg-red-600 text-xs flex items-center justify-center"
                                            >
                                                X
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {editingItem?.type === "deliverable" && editingItem.id === d.id && (
                                <DateEditor item={d} type="deliverable" />
                            )}
                        </div>
                    );
                })}
            </div>
          </div>

        </div>
      </div>
    </div>
    
    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-center gap-4 export-hide">
      <span className="text-sm font-semibold text-slate-600">Tilføj til tidslinje:</span>
      <button onClick={() => handleAddItem("phase")} className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200">Fase</button>
      <button onClick={() => handleAddItem("milestone")} className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full hover:bg-purple-200">Milepæl</button>
      <button onClick={() => handleAddItem("deliverable")} className="text-sm bg-teal-100 text-teal-800 px-3 py-1 rounded-full hover:bg-teal-200">Leverance</button>
    </div>
  </div>
  );
};




