import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { Phase, Milestone, Deliverable } from '../types';
import { EditableField } from './EditableField';
import { TimelineInspectorPanel, TimelineInspectorSelection } from './TimelineInspectorPanel';

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
  readOnly?: boolean;
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

const DELIVERABLE_CARD_PERCENT_AT_BASE_ZOOM = 18;
const DELIVERABLE_BUFFER_PERCENT = 1;
const TIMELINE_BASE_HEIGHT_REM = 22;
const MIN_TIMELINE_HEIGHT_REM = 32;

type TimelineSelection = { type: 'phase' | 'milestone' | 'deliverable'; id: string };
type DragPreviewState =
  | { type: 'phase'; id: string; start: number; end: number }
  | { type: 'milestone' | 'deliverable'; id: string; position: number };

export const Timeline: React.FC<TimelineProps> = (props) => {
  const {
    projectStartDate, projectEndDate,
    phases, milestones, deliverables, calculateDateFromPosition, calculatePositionFromDate, monthMarkers, todayPosition,
  addTimelineItem, updateTimelineItem, deleteTimelineItem, readOnly = false
  } = props;
  const clampPercent = useCallback((value: number | null | undefined) => {
    if (!Number.isFinite(value ?? null)) return 0;
    return Math.max(0, Math.min(100, value as number));
  }, []);
  const getPositionFromDateString = useCallback(
    (date?: string | null) => {
      if (!date) return null;
      const pos = calculatePositionFromDate(date);
      return Number.isFinite(pos) ? clampPercent(pos) : null;
    },
    [calculatePositionFromDate, clampPercent],
  );
  const normalizedMilestones = useMemo(
    () =>
      milestones.map((m) => {
        const fallback = getPositionFromDateString(m.date) ?? 0;
        const position = Number.isFinite(m.position) ? clampPercent(m.position) : fallback;
        return { ...m, position };
      }),
    [milestones, getPositionFromDateString, clampPercent],
  );
  const normalizedDeliverables = useMemo(() => {
    return deliverables.map((d) => {
      const fallback = getPositionFromDateString(d.startDate ?? d.endDate ?? projectStartDate) ?? 0;
      const position = Number.isFinite(d.position) ? clampPercent(d.position) : fallback;
      return { ...d, position };
    });
  }, [deliverables, getPositionFromDateString, clampPercent, projectStartDate]);
  const isTimelineEmpty = phases.length === 0 && normalizedMilestones.length === 0 && normalizedDeliverables.length === 0;
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollRatioRef = useRef<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<TimelineZoom>('quarter');
  const zoomScale = ZOOM_LEVELS[zoomLevel].scale;
  const { layout: deliverableLayouts, laneCount: deliverableLaneCount } = useMemo(() => {
    if (normalizedDeliverables.length === 0) {
      return { layout: {}, laneCount: 0 };
    }
    // Fallback: if project dates are invalid, keep a minimal width to avoid collapsing
    const safePosition = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0);
    const sorted = [...normalizedDeliverables].sort((a, b) => safePosition(a.position) - safePosition(b.position));
    const layout: Record<string, { lane: number }> = {};
    const laneEndPositions: number[] = [];
    const minCardWidthPercent = 8;
    const estimatedCardWidth = Math.max(minCardWidthPercent, DELIVERABLE_CARD_PERCENT_AT_BASE_ZOOM / zoomScale);
    const halfWidth = estimatedCardWidth / 2;

    sorted.forEach((deliverable) => {
      const pos = safePosition(deliverable.position);
      const start = Math.max(0, pos - halfWidth);
      const end = Math.min(100, pos + halfWidth);
      let laneIndex = laneEndPositions.findIndex((laneEnd) => start >= laneEnd + DELIVERABLE_BUFFER_PERCENT);
      if (laneIndex === -1) {
        laneIndex = laneEndPositions.length;
        laneEndPositions.push(end);
      } else {
        laneEndPositions[laneIndex] = end;
      }
      layout[deliverable.id] = { lane: laneIndex };
    });

    return { layout, laneCount: laneEndPositions.length || (normalizedDeliverables.length > 0 ? 1 : 0) };
  }, [normalizedDeliverables, zoomScale]);
  const [selectedItem, setSelectedItem] = useState<TimelineSelection | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);
  const suppressClickRef = useRef(false);
  const [hoveredDeliverableId, setHoveredDeliverableId] = useState<string | null>(null);
  const deliverableLaneSpacingRem = 4.25;
  const deliverableTopOffsetRem = 1.25;

  const deliverableSectionHeightRem = useMemo(() => {
    const laneCount = deliverableLaneCount > 0 ? deliverableLaneCount : (normalizedDeliverables.length > 0 ? 1 : 0);
    if (laneCount === 0) {
      return 10;
    }
    const highestTop = deliverableTopOffsetRem + (laneCount - 1) * deliverableLaneSpacingRem;
    const cardAllowance = 9;
    return highestTop + cardAllowance;
  }, [deliverableLaneCount, normalizedDeliverables.length]);

  const timelineHeightRem = useMemo(
    () => Math.max(MIN_TIMELINE_HEIGHT_REM, TIMELINE_BASE_HEIGHT_REM + deliverableSectionHeightRem),
    [deliverableSectionHeightRem],
  );

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
    applyPendingScrollCenter();
  }, [zoomScale, applyPendingScrollCenter]);


  const handleAddItem = (type: 'phase' | 'milestone' | 'deliverable') => {
    if (readOnly) return;
    addTimelineItem(type, 45); // Add near center, easier to grab
  };

  const handleSelectItem = useCallback(
    (selection: TimelineSelection | null) => {
      if (readOnly) {
        return;
      }
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      setSelectedItem(selection);
    },
    [readOnly],
  );

  const selectedInspectorItem = useMemo<TimelineInspectorSelection | null>(() => {
    if (!selectedItem) {
      return null;
    }
    if (selectedItem.type === 'phase') {
      const phase = phases.find((p) => p.id === selectedItem.id);
      return phase ? { type: 'phase', item: phase } : null;
    }
    if (selectedItem.type === 'milestone') {
      const milestone = normalizedMilestones.find((m) => m.id === selectedItem.id);
      return milestone ? { type: 'milestone', item: milestone } : null;
    }
    const deliverable = normalizedDeliverables.find((d) => d.id === selectedItem.id);
    return deliverable ? { type: 'deliverable', item: deliverable } : null;
  }, [selectedItem, phases, normalizedMilestones, normalizedDeliverables]);

  useEffect(() => {
    if (selectedItem && !selectedInspectorItem) {
      setSelectedItem(null);
    }
  }, [selectedItem, selectedInspectorItem]);

  const [draggedItem, setDraggedItem] = useState<{type: 'phase' | 'milestone' | 'deliverable', id: string, mode: 'move' | 'resize-end', initialX: number, initialPos: number, initialWidth?: number} | null>(null);

  const handleDragStart = (e: React.MouseEvent, type: 'phase' | 'milestone' | 'deliverable', id: string, mode: 'move' | 'resize-end') => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClickRef.current = false;
    setDragPreview(null);
    
    let item: Phase | Milestone | Deliverable | undefined;
    if (type === 'phase') item = phases.find(i => i.id === id);
    else if (type === 'milestone') item = milestones.find(i => i.id === id);
    else item = normalizedDeliverables.find(i => i.id === id);

    if (!item) return;

    const initialPos = 'position' in item ? item.position : (item as Phase).start;
    const initialWidth = 'end' in item ? (item as Phase).end - (item as Phase).start : undefined;

    setDraggedItem({
      type,
      id,
      mode,
      initialX: e.clientX,
      initialPos,
      ...(initialWidth !== undefined ? { initialWidth } : {}),
    });
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedItem || !timelineRef.current) return;
    
    const { type, id, mode, initialX, initialPos, initialWidth } = draggedItem;
    const rect = timelineRef.current.getBoundingClientRect();
    if (rect.width === 0) return;

    const dx = e.clientX - initialX;
    if (!suppressClickRef.current && Math.abs(dx) > 2) {
      suppressClickRef.current = true;
    }
    const dPos = (dx / rect.width) * 100;

    if (mode === 'move') {
        if (type === 'phase' && initialWidth !== undefined) {
            const boundedStart = Math.max(0, Math.min(initialPos + dPos, 100 - initialWidth));
            const boundedEnd = Math.min(boundedStart + initialWidth, 100);
            setDragPreview({ type: 'phase', id, start: boundedStart, end: boundedEnd });
        } else if (type === 'milestone' || type === 'deliverable') {
            const boundedPos = Math.max(0, Math.min(initialPos + dPos, 100));
            setDragPreview({ type, id, position: boundedPos });
        }
    } else if (mode === 'resize-end' && type === 'phase' && initialWidth !== undefined) {
        const nextWidth = Math.max(1, initialWidth + dPos);
        const boundedEnd = Math.min(initialPos + nextWidth, 100);
        setDragPreview({ type: 'phase', id, start: initialPos, end: boundedEnd });
    }
  }, [draggedItem]);

  const handleMouseUp = useCallback(() => {
    if (draggedItem) {
      const preview = dragPreview;
      if (draggedItem.type === 'phase') {
        const originalStart = draggedItem.initialPos;
        const originalEnd = draggedItem.initialWidth !== undefined ? draggedItem.initialPos + draggedItem.initialWidth : originalStart;
        if (draggedItem.mode === 'move') {
          const nextStart = preview && preview.type === 'phase' && preview.id === draggedItem.id ? preview.start : originalStart;
          const nextEnd = preview && preview.type === 'phase' && preview.id === draggedItem.id ? preview.end : originalEnd;
          if (nextStart !== originalStart || nextEnd !== originalEnd) {
            updateTimelineItem('phase', draggedItem.id, { start: nextStart, end: nextEnd });
          }
        } else if (draggedItem.mode === 'resize-end') {
          const nextEnd = preview && preview.type === 'phase' && preview.id === draggedItem.id ? preview.end : originalEnd;
          if (nextEnd !== originalEnd) {
            updateTimelineItem('phase', draggedItem.id, { end: nextEnd });
          }
        }
      } else {
        const nextPosition = preview && preview.type === draggedItem.type && preview.id === draggedItem.id
          ? preview.position
          : draggedItem.initialPos;
        if (nextPosition !== draggedItem.initialPos) {
          updateTimelineItem(draggedItem.type, draggedItem.id, { position: nextPosition });
        }
      }
    }
    setDraggedItem(null);
    setDragPreview(null);
    if (suppressClickRef.current) {
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  }, [draggedItem, dragPreview, updateTimelineItem]);

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
  
  return (
  <div className="bg-white p-4 rounded-lg shadow-sm">
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
      <div
        className="overflow-x-auto overflow-y-hidden"
        ref={scrollContainerRef}
        style={{ minHeight: `${timelineHeightRem}rem` }}
      >
        <div
          className="relative min-w-full select-none pt-12"
          style={{ width: `${Math.max(zoomScale * 100, 100)}%`, minHeight: `${timelineHeightRem}rem` }}
          ref={timelineRef}
          onClick={() => handleSelectItem(null)}
        >
          {isTimelineEmpty && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 px-6 py-8 text-center text-sm text-slate-500">
                Tidslinjen er tom. Brug knapperne for at tilføje din første fase, milepæl eller leverance.
              </div>
            </div>
          )}
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
              {normalizedMilestones.map((m) => {
                const isSelected = selectedItem?.type === 'milestone' && selectedItem.id === m.id;
                const milestonePreview = dragPreview?.type === 'milestone' && dragPreview.id === m.id ? dragPreview.position : null;
                const milestonePosition = Number.isFinite(milestonePreview)
                  ? milestonePreview
                  : (Number.isFinite(m.position) ? m.position : 0);
                return (
                  <div
                    key={m.id}
                    className={`absolute cursor-move ${isSelected ? 'z-20' : 'z-10'}`}
                    style={{ left: `${milestonePosition}%`, bottom: '0.5rem' }}
                    onMouseDown={readOnly ? undefined : (e) => handleDragStart(e, 'milestone', m.id, 'move')}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectItem({ type: 'milestone', id: m.id });
                    }}
                  >
                    <div className="flex flex-col items-center -translate-x-1/2 timeline-item-centered">
                      <div className={`bg-white px-2 py-1 rounded-md shadow text-xs whitespace-nowrap mb-2 ${isSelected ? 'ring-2 ring-purple-300' : ''}`}>
                        <EditableField disabled={readOnly} initialValue={m.text} onSave={(text) => updateTimelineItem('milestone', m.id, { text })} className="!p-0" />
                      </div>
                      <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[9px] ${isSelected ? 'border-b-purple-600' : 'border-b-purple-500'}`} title={calculateDateFromPosition(milestonePosition)}></div>
                      <div className={`w-px h-6 ${isSelected ? 'bg-purple-600' : 'bg-purple-500'}`}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phases */}
            <div className="relative h-12 my-2">
              {phases.map((phase) => {
                const color = phaseColors[phase.highlight] || phaseColors.blue;
                const isSelected = selectedItem?.type === 'phase' && selectedItem.id === phase.id;
                const phasePreview = dragPreview?.type === 'phase' && dragPreview.id === phase.id ? dragPreview : null;
                const phaseStart = phasePreview ? phasePreview.start : phase.start;
                const phaseEnd = phasePreview ? phasePreview.end : phase.end;
                return (
                  <div
                    key={phase.id}
                    className="relative"
                    style={{ position: 'absolute', left: `${phaseStart}%`, width: `${phaseEnd - phaseStart}%`, height: '100%' }}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectItem({ type: 'phase', id: phase.id });
                    }}
                  >
                    <div
                      className={`h-8 rounded ${color.bg} border-l-4 ${color.border} flex items-center px-2 cursor-move z-10 absolute top-1/2 -translate-y-1/2 w-full timeline-phase-bar ${isSelected ? 'ring-2 ring-offset-1 ring-slate-600' : ''}`}
                      onMouseDown={readOnly ? undefined : (e) => handleDragStart(e, 'phase', phase.id, 'move')}
                      title={`${phase.text} (${calculateDateFromPosition(phaseStart)} - ${calculateDateFromPosition(phaseEnd)})`}
                    >
                      <div className="flex-grow w-full overflow-hidden whitespace-nowrap">
                        <EditableField disabled={readOnly} initialValue={phase.text} onSave={(text) => updateTimelineItem('phase', phase.id, { text })} className="text-sm font-semibold !p-0 bg-transparent truncate" />
                      </div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 export-hide"
                        onMouseDown={readOnly ? undefined : (e) => handleDragStart(e, 'phase', phase.id, 'resize-end')}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Deliverables */}
            <div className="relative" style={{ height: `${deliverableSectionHeightRem}rem` }}>
                {normalizedDeliverables.map((d) => {
                    const layout = deliverableLayouts[d.id];
                    const laneIndex = layout ? layout.lane : 0;
                    const topRem = deliverableTopOffsetRem + laneIndex * deliverableLaneSpacingRem;
                    const lineHeightRem = topRem + 3;
                    const isHovered = hoveredDeliverableId === d.id;
                    const isSelected = selectedItem?.type === 'deliverable' && selectedItem.id === d.id;
                    const deliverablePreview = dragPreview?.type === 'deliverable' && dragPreview.id === d.id ? dragPreview.position : null;
                    const deliverablePosition = deliverablePreview ?? d.position;
                    const deliverableDateIso = calculateDateFromPosition(deliverablePosition);
                    const deliverableDate = (() => {
                        const parsed = new Date(deliverableDateIso);
                        return Number.isNaN(parsed.getTime())
                          ? deliverableDateIso
                          : parsed.toLocaleDateString(daLocale, { day: 'numeric', month: 'short', year: 'numeric' });
                    })();

                    return (
                        <div
                            key={d.id}
                            className={`absolute cursor-move transition-all duration-300 ${isHovered || isSelected ? 'z-30 scale-[1.02]' : 'z-10'}`}
                            style={{ left: `${deliverablePosition}%`, top: `${topRem}rem` }}
                            onMouseDown={readOnly ? undefined : (e) => handleDragStart(e, 'deliverable', d.id, 'move')}
                            onMouseEnter={() => setHoveredDeliverableId(d.id)}
                            onMouseLeave={() => setHoveredDeliverableId((current) => (current === d.id ? null : current))}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSelectItem({ type: 'deliverable', id: d.id });
                            }}
                            title={deliverableDate}
                        >
                            <div className="flex flex-col items-center -translate-x-1/2 timeline-item-centered">
                                <div
                                    className="absolute bottom-full w-px bg-teal-400 border-l border-dashed border-teal-400 -z-10"
                                    style={{ height: `${lineHeightRem}rem` }}
                                ></div>
                                <div className={`w-3 h-3 rounded-full ring-4 ${isHovered || isSelected ? 'bg-teal-600 ring-teal-200' : 'bg-teal-500 ring-white'}`}></div>
                                <div
                                    className={`bg-white px-3 py-2 rounded-md shadow text-xs leading-snug mt-2 max-w-[14rem] min-h-[3rem] text-center whitespace-normal break-words flex flex-col items-center gap-1 ${isHovered || isSelected ? 'ring-2 ring-teal-200 shadow-lg' : ''}`}
                                >
                                    <EditableField
                                        disabled={readOnly}
                                        initialValue={d.text}
                                        onSave={(textValue) => updateTimelineItem('deliverable', d.id, { text: textValue })}
                                        className="!p-0 w-full"
                                        wrapDisplay
                                    />
                                    <div className="flex items-center justify-between w-full text-[10px] text-slate-500">
                                        <span className="text-left">{deliverableDate}</span>
                                        <span className="text-slate-400">{isSelected ? 'Valgt' : ''}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>

        </div>
      </div>
    </div>

    {!readOnly && (
      <TimelineInspectorPanel
        selection={selectedInspectorItem}
        calculateDateFromPosition={calculateDateFromPosition}
        calculatePositionFromDate={calculatePositionFromDate}
        updateTimelineItem={updateTimelineItem}
        deleteTimelineItem={deleteTimelineItem}
        onClearSelection={() => setSelectedItem(null)}
        phaseColors={phaseColors}
      />
    )}

    {!readOnly && (
      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-center gap-4 export-hide">
        <span className="text-sm font-semibold text-slate-600">Tilføj til tidslinje:</span>
        <button onClick={() => handleAddItem("phase")} className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200">Fase</button>
        <button onClick={() => handleAddItem("milestone")} className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full hover:bg-purple-200">Milepæl</button>
        <button onClick={() => handleAddItem("deliverable")} className="text-sm bg-teal-100 text-teal-800 px-3 py-1 rounded-full hover:bg-teal-200">Leverance</button>
      </div>
    )}
  </div>
  );
};

