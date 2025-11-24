
import React, { useState, useRef, useEffect } from 'react';
import { Milestone, Project, Phase, Deliverable, Workstream } from '../../types/milestone-plan';
import { CheckCircle2, Circle, Clock, AlertTriangle, Calendar, Trash2, Layers, Plus, X, Check, Edit2, User, List, GanttChart, HelpCircle, Palette, ArrowRight } from 'lucide-react';
import { NewMilestoneModal } from './modals/NewMilestoneModal';
import { NewPhaseModal } from './modals/NewPhaseModal';
import { DeliverableDetailModal } from './modals/DeliverableDetailModal';
import { ProjectGuideModal } from './modals/ProjectGuideModal';
import { WorkstreamManagerModal } from './modals/WorkstreamManagerModal';

// Constants for layout calculation
const LEFT_COL_WIDTH = 240;
const CANVAS_WIDTH = 2400;
const HEADER_OFFSET = 50;
const BAR_HEIGHT = 80;
const BAR_GAP = 12;

interface MilestonePlanProps {
    project: Project;
    onSavePhase: (phase: Phase) => Promise<void>;
    onDeletePhase: (phaseId: string) => Promise<void>;
    onSaveMilestone: (milestone: Milestone) => Promise<void>;
    onDeleteMilestone: (milestoneId: string) => Promise<void>;
    onSaveDeliverable: (milestoneId: string, deliverable: Deliverable) => Promise<void>;
    onDeleteDeliverable: (milestoneId: string, deliverableId: string) => Promise<void>;
    onSaveWorkstream: (ws: Workstream) => void;
    onDeleteWorkstream: (id: string) => void;
}

// Predefined palette for workstreams
const WS_PALETTE = [
    '#64748b', // Slate
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#d946ef', // Fuchsia
    '#f43f5e', // Rose
];

export const MilestonePlan: React.FC<MilestonePlanProps & { projectMembers?: { id: string; name: string; role: string }[] }> = ({
    project,
    onSavePhase,
    onDeletePhase,
    onSaveMilestone,
    onDeleteMilestone,
    onSaveDeliverable,
    onDeleteDeliverable,
    onSaveWorkstream,
    onDeleteWorkstream,
    projectMembers = []
}) => {
    const [viewMode, setViewMode] = useState<'list' | 'gantt'>('gantt');
    const [isMilestoneModalOpen, setMilestoneModalOpen] = useState(false);
    const [isPhaseModalOpen, setPhaseModalOpen] = useState(false);
    const [isDeliverableModalOpen, setDeliverableModalOpen] = useState(false);
    const [isGuideOpen, setGuideOpen] = useState(false);
    const [isWorkstreamManagerOpen, setWorkstreamManagerOpen] = useState(false);

    // Edit states
    const [milestoneToEdit, setMilestoneToEdit] = useState<Milestone | null>(null);
    const [phaseToEdit, setPhaseToEdit] = useState<Phase | null>(null);
    const [deliverableToEdit, setDeliverableToEdit] = useState<{ milestoneId: string, data: Deliverable } | null>(null);

    // State for inline deliverable adding
    const [addingToMilestone, setAddingToMilestone] = useState<string | null>(null);
    const [newDeliverableText, setNewDeliverableText] = useState('');
    const [, setInlineSaving] = useState(false);
    const [isGlobalAddDeliverable, setIsGlobalAddDeliverable] = useState(false);

    // State for Workstream Colors
    const [wsColors, setWsColors] = useState<Record<string, string>>({});
    const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);



    // Refs for scroll syncing
    const headerRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (headerRef.current) {
            headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    // Helper to get color (saved or generated default)
    const getWorkstreamColor = (wsName: string, index: number) => {
        if (wsColors[wsName]) return wsColors[wsName];
        return WS_PALETTE[index % WS_PALETTE.length];
    };

    const translateStatus = (status: string) => {
        switch (status) {
            case 'Completed': return 'Gennemført';
            case 'Pending': return 'Afventer';
            case 'Delayed': return 'Forsinket';
            case 'On Track': return 'I Rute';
            case 'At Risk': return 'I Risiko';
            default: return status;
        }
    };

    interface DragState {
        type: 'move' | 'resize-left' | 'resize-right';
        itemType: 'deliverable' | 'phase';
        itemId: string;
        deliverable?: Deliverable;
        phase?: Phase;
        milestoneId?: string; // Only for deliverables
        startX: number;
        originalStartMs: number;
        originalEndMs: number;
        currentStartMs: number;
        currentEndMs: number;
    }

    const [dragState, setDragState] = useState<DragState | null>(null);
    const [optimisticItems, setOptimisticItems] = useState<Record<string, { startMs: number; endMs: number }>>({});

    // Sort milestones by date
    const sortedMilestones = [...project.milestones].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate Progress
    const total = project.milestones.length;
    const completed = project.milestones.filter(m => m.status === 'Completed').length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Calculate Timeline Range for Phases & Gantt
    const today = new Date();
    let minDate: number;
    let maxDate: number;

    if (project.startDate && project.endDate) {
        minDate = new Date(project.startDate).getTime();
        maxDate = new Date(project.endDate).getTime();
    } else {
        // Fallback: Dynamic calculation based on content
        minDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime();
        maxDate = new Date(today.getFullYear(), today.getMonth() + 5, 0).getTime();

        const phases = project.phases || [];
        if (phases.length > 0 || project.milestones.length > 0) {
            const timestamps = [
                ...phases.flatMap(p => [new Date(p.startDate).getTime(), new Date(p.endDate).getTime()]),
                ...project.milestones.map(m => new Date(m.date).getTime()),
                ...project.milestones.flatMap(m => m.deliverables?.flatMap(d => [
                    d.startDate ? new Date(d.startDate).getTime() : null,
                    d.endDate ? new Date(d.endDate).getTime() : null
                ].filter(Boolean) as number[]) || [])
            ];
            if (timestamps.length > 0) {
                const min = Math.min(...timestamps);
                const max = Math.max(...timestamps);
                const range = max - min;
                minDate = min - (range * 0.05); // 5% buffer
                maxDate = max + (range * 0.05);
            }
        }
    }

    const totalDuration = Math.max(maxDate - minDate, 24 * 60 * 60 * 1000);

    // Clear optimistic state when real project data updates
    useEffect(() => {
        setOptimisticItems({});
    }, [project]);

    // --- Drag Logic Effect ---
    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e: MouseEvent) => {
            const timelineWidth = CANVAS_WIDTH - LEFT_COL_WIDTH;
            const msPerPixel = totalDuration / timelineWidth;
            const pixelDelta = e.clientX - dragState.startX;
            const msDelta = pixelDelta * msPerPixel;

            let newStart = dragState.originalStartMs;
            let newEnd = dragState.originalEndMs;

            if (dragState.type === 'move') {
                newStart += msDelta;
                newEnd += msDelta;
            } else if (dragState.type === 'resize-left') {
                newStart += msDelta;
                if (newStart > newEnd - 86400000) newStart = newEnd - 86400000;
            } else if (dragState.type === 'resize-right') {
                newEnd += msDelta;
                if (newEnd < newStart + 86400000) newEnd = newStart + 86400000;
            }

            setDragState(prev => prev ? ({
                ...prev,
                currentStartMs: newStart,
                currentEndMs: newEnd
            }) : null);
        };

        const handleMouseUp = async () => {
            if (dragState) {
                const formatDate = (ms: number) => {
                    const d = new Date(ms);
                    return d.toISOString().split('T')[0];
                };

                if (dragState.itemType === 'deliverable' && dragState.deliverable && dragState.milestoneId) {
                    const updatedDeliverable = {
                        ...dragState.deliverable,
                        startDate: formatDate(dragState.currentStartMs),
                        endDate: formatDate(dragState.currentEndMs)
                    };

                    setOptimisticItems(prev => ({
                        ...prev,
                        [dragState.itemId]: {
                            startMs: dragState.currentStartMs,
                            endMs: dragState.currentEndMs
                        }
                    }));

                    onSaveDeliverable(dragState.milestoneId, updatedDeliverable);
                } else if (dragState.itemType === 'phase' && dragState.phase) {
                    const updatedPhase = {
                        ...dragState.phase,
                        startDate: formatDate(dragState.currentStartMs),
                        endDate: formatDate(dragState.currentEndMs)
                    };

                    setOptimisticItems(prev => ({
                        ...prev,
                        [dragState.itemId]: {
                            startMs: dragState.currentStartMs,
                            endMs: dragState.currentEndMs
                        }
                    }));

                    onSavePhase(updatedPhase);
                }

                setDragState(null);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, totalDuration, onSaveDeliverable, onSavePhase]);

    const startDrag = (e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right', d: Deliverable, milestoneId: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (type !== 'move') e.stopPropagation();
        if (!d.startDate || !d.endDate) return;

        setDragState({
            type,
            itemType: 'deliverable',
            itemId: d.id,
            deliverable: d,
            milestoneId,
            startX: e.clientX,
            originalStartMs: new Date(d.startDate).getTime(),
            originalEndMs: new Date(d.endDate).getTime(),
            currentStartMs: new Date(d.startDate).getTime(),
            currentEndMs: new Date(d.endDate).getTime()
        });
    };

    const startPhaseDrag = (e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right', phase: Phase) => {
        e.stopPropagation();
        e.preventDefault();
        if (type !== 'move') e.stopPropagation();

        setDragState({
            type,
            itemType: 'phase',
            itemId: phase.id,
            phase: phase,
            startX: e.clientX,
            originalStartMs: new Date(phase.startDate).getTime(),
            originalEndMs: new Date(phase.endDate).getTime(),
            currentStartMs: new Date(phase.startDate).getTime(),
            currentEndMs: new Date(phase.endDate).getTime()
        });
    };

    const handleMilestoneModalSave = async (milestoneData: Omit<Milestone, 'id'>) => {
        if (milestoneToEdit) {
            await onSaveMilestone({ ...milestoneData, id: milestoneToEdit.id });
        } else {
            await onSaveMilestone({ ...milestoneData, id: crypto.randomUUID() });
        }
        setMilestoneToEdit(null);
    };

    const handlePhaseModalSave = async (phaseData: Omit<Phase, 'id'>) => {
        if (phaseToEdit) {
            await onSavePhase({ ...phaseData, id: phaseToEdit.id });
        } else {
            await onSavePhase({ ...phaseData, id: crypto.randomUUID() });
        }
        setPhaseToEdit(null);
    };

    const handleDeliverableModalSave = async (updatedDeliverable: Deliverable, milestoneId?: string) => {
        const mId = milestoneId || deliverableToEdit?.milestoneId;
        if (!mId) return;
        await onSaveDeliverable(mId, updatedDeliverable);
        setDeliverableToEdit(null);
        setIsGlobalAddDeliverable(false);
    };

    const handleInlineAddDeliverable = async (milestoneId: string) => {
        if (!newDeliverableText.trim()) return;
        setInlineSaving(true);
        try {
            const newDeliverable: Deliverable = {
                id: crypto.randomUUID(),
                title: newDeliverableText.trim(),
                status: 'Pending',
                owner: 'Unassigned',
                checklist: [],
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
            };
            await onSaveDeliverable(milestoneId, newDeliverable);
            setAddingToMilestone(null);
            setNewDeliverableText('');
        } finally {
            setInlineSaving(false);
        }
    };

    const openNewMilestone = () => { setMilestoneToEdit(null); setMilestoneModalOpen(true); };
    const openEditMilestone = (m: Milestone) => { setMilestoneToEdit(m); setMilestoneModalOpen(true); };
    const openDeliverableDetail = (milestoneId: string, deliverable: Deliverable) => { setDeliverableToEdit({ milestoneId, data: deliverable }); setDeliverableModalOpen(true); }
    const openNewPhase = () => { setPhaseToEdit(null); setPhaseModalOpen(true); };
    const openEditPhase = (p: Phase) => { setPhaseToEdit(p); setPhaseModalOpen(true); };
    const openNewDeliverable = () => {
        setDeliverableToEdit({
            milestoneId: '',
            data: {
                id: crypto.randomUUID(),
                title: '',
                status: 'Pending',
                checklist: [],
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
            }
        });
        setIsGlobalAddDeliverable(true);
        setDeliverableModalOpen(true);
    };

    const getStatusIcon = (status: Milestone['status']) => {
        switch (status) {
            case 'Completed': return <CheckCircle2 className="text-green-500" size={20} />;
            case 'Delayed': return <AlertTriangle className="text-red-500" size={20} />;
            case 'On Track': return <Clock className="text-blue-500" size={20} />;
            default: return <Circle className="text-slate-300" size={20} />;
        }
    };

    const getStatusColor = (status: Milestone['status']) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'Delayed': return 'bg-red-100 text-red-800 border-red-200';
            case 'On Track': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getDaysLabel = (dateStr: string) => {
        const target = new Date(dateStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diffTime = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return <span className="text-blue-600 font-bold">I dag</span>;
        if (diffDays < 0) return <span className="text-slate-400">{Math.abs(diffDays)} dage siden</span>;
        return <span className={diffDays < 7 ? "text-orange-600 font-medium" : "text-slate-500"}>Om {diffDays} dage</span>;
    };

    const renderGanttView = () => {
        // Prepare rows based on Defined Workstreams
        const rows = project.workstreams.map((ws, idx) => {
            // Find milestones matching this workstream name
            const milestonesInWs = project.milestones.filter(m => m.workstream === ws.name);

            const allDeliverables = milestonesInWs.flatMap(m =>
                (m.deliverables || []).filter(d => d.startDate && d.endDate).map(d => ({
                    ...d,
                    milestoneId: m.id,
                    startMs: new Date(d.startDate!).getTime(),
                    endMs: new Date(d.endDate!).getTime()
                }))
            ).sort((a, b) => a.startMs - b.startMs);

            const lanes: number[] = [];
            const stackedDeliverables = allDeliverables.map(d => {
                const isDragging = dragState?.itemType === 'deliverable' && dragState?.deliverable?.id === d.id;
                const optimistic = optimisticItems[d.id];
                const effectiveStart = isDragging ? dragState!.currentStartMs : (optimistic ? optimistic.startMs : d.startMs);
                const effectiveEnd = isDragging ? dragState!.currentEndMs : (optimistic ? optimistic.endMs : d.endMs);

                let laneIndex = -1;
                for (let l = 0; l < lanes.length; l++) {
                    if (lanes[l] < effectiveStart) {
                        laneIndex = l;
                        lanes[l] = effectiveEnd + (1000 * 60 * 60 * 12);
                        break;
                    }
                }
                if (laneIndex === -1) {
                    laneIndex = lanes.length;
                    lanes.push(effectiveEnd + (1000 * 60 * 60 * 12));
                }
                return { ...d, laneIndex, startMs: effectiveStart, endMs: effectiveEnd };
            });

            const totalLanes = Math.max(1, lanes.length);
            const rowHeight = Math.max(120, HEADER_OFFSET + (totalLanes * (BAR_HEIGHT + BAR_GAP)) + 20);
            const color = getWorkstreamColor(ws.name, idx);

            return { ws, milestonesInWs, stackedDeliverables, rowHeight, color };
        });

        const STICKY_TOP_OFFSET = 144;

        // Time Markers
        const timeMarkers: Date[] = [];
        const curr = new Date(minDate);
        const end = new Date(maxDate);
        curr.setDate(1);
        while (curr < end) {
            timeMarkers.push(new Date(curr));
            curr.setMonth(curr.getMonth() + 1);
        }

        // Current Time Line calc
        const now = new Date().getTime();
        const currentLeft = ((now - minDate) / totalDuration) * 100;
        const isCurrentTimeVisible = now >= minDate && now <= maxDate;

        return (
            <div className="flex flex-col relative bg-white rounded-xl border border-slate-200 shadow-sm select-none flex-1 h-full">
                {/* Legend */}
                <div className="flex flex-wrap gap-6 p-4 text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50 rounded-t-xl z-10 relative">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-4 bg-slate-200 rounded border border-slate-300"></div>
                        <span><strong>Fase:</strong> Tidsperiode</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-500 rotate-45 transform"></div>
                        <span><strong>Milepæl:</strong> Deadline</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-2 bg-emerald-200 rounded border border-emerald-300 flex justify-center items-center"><span className="w-1 h-full bg-emerald-300"></span></div>
                        <span><strong>Aktivitet:</strong> Træk kanter for at ændre tid</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-0.5 h-4 border-l-2 border-dashed border-red-500"></div>
                        <span><strong>I dag:</strong> Nutid</span>
                    </div>
                </div>

                {/* Header (Sticky) */}
                <div
                    ref={headerRef}
                    className="overflow-hidden border-b border-slate-200 bg-white z-30 shadow-sm"
                    style={{ position: 'sticky', top: STICKY_TOP_OFFSET }}
                >
                    <div style={{ minWidth: '100%', width: CANVAS_WIDTH }} className="flex">
                        <div
                            className="shrink-0 border-r border-slate-200 flex items-end pb-2 pl-4 z-[35] bg-white shadow-[4px_0_16px_rgba(0,0,0,0.02)]"
                            style={{ width: LEFT_COL_WIDTH, position: 'sticky', left: 0 }}
                        >
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Layers size={12} /> Faser & Indsatser
                            </span>
                        </div>
                        <div className="flex-1 relative h-[72px]">
                            {/* Dates */}
                            <div className="h-8 border-b border-slate-100 relative w-full">
                                {timeMarkers.map((date, i) => {
                                    const left = ((date.getTime() - minDate) / totalDuration) * 100;
                                    return (
                                        <div key={i} className="absolute text-xs text-slate-400 font-bold uppercase transform -translate-x-1/2 pl-2 border-l border-slate-200 h-full flex items-center" style={{ left: `${left}%` }}>
                                            {date.toLocaleDateString('da-DK', { month: 'short', year: '2-digit' })}
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Phases */}
                            <div className="h-10 relative w-full">
                                {project.phases.map(phase => {
                                    const isDragging = dragState?.itemType === 'phase' && dragState?.phase?.id === phase.id;
                                    const optimistic = optimisticItems[phase.id];

                                    const start = isDragging ? dragState!.currentStartMs : (optimistic ? optimistic.startMs : new Date(phase.startDate).getTime());
                                    const end = isDragging ? dragState!.currentEndMs : (optimistic ? optimistic.endMs : new Date(phase.endDate).getTime());

                                    const left = ((start - minDate) / totalDuration) * 100;
                                    const width = ((end - start) / totalDuration) * 100;

                                    const phaseColor = phase.color || '#e2e8f0'; // Default slate-200

                                    return (
                                        <div
                                            key={phase.id}
                                            onMouseDown={(e) => startPhaseDrag(e, 'move', phase)}
                                            onClick={() => {
                                                if (!isDragging) openEditPhase(phase);
                                            }}
                                            className={`absolute top-1.5 bottom-1.5 rounded border border-slate-300/50 cursor-grab active:cursor-grabbing text-[10px] font-bold text-slate-700 flex items-center justify-center overflow-visible whitespace-nowrap px-2 shadow-sm transition-shadow group
                                                ${isDragging ? 'z-50 shadow-xl opacity-90 ring-2 ring-indigo-400' : 'hover:shadow-md'}
                                            `}
                                            style={{
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                backgroundColor: phaseColor
                                            }}
                                        >
                                            {/* Resize Handles */}
                                            <div
                                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 z-10"
                                                onMouseDown={(e) => startPhaseDrag(e, 'resize-left', phase)}
                                            />
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 z-10"
                                                onMouseDown={(e) => startPhaseDrag(e, 'resize-right', phase)}
                                            />
                                            <span className="pointer-events-none select-none truncate px-1">{phase.name}</span>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onDeletePhase(phase.id);
                                                }}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Current Time Line (Header) */}
                            {isCurrentTimeVisible && (
                                <div
                                    className="absolute top-0 bottom-0 z-40 border-l-2 border-red-500 border-dashed pointer-events-none flex flex-col items-center"
                                    style={{ left: `${currentLeft}%` }}
                                >
                                    <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-b shadow-sm transform -translate-y-0.5">
                                        I dag
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Body Container */}
                <div
                    ref={bodyRef}
                    onScroll={handleBodyScroll}
                    className="overflow-x-auto pb-4 flex-1"
                >
                    <div style={{ minWidth: '100%', width: CANVAS_WIDTH }}>
                        <div>
                            {rows.map((row, _idx) => (
                                <div
                                    key={row.ws.id}
                                    className="flex border-b border-slate-200 transition-colors relative"
                                    style={{
                                        height: row.rowHeight,
                                        backgroundColor: `${row.color}0D`,
                                        zIndex: activeColorPicker === row.ws.name ? 50 : 10
                                    }}
                                >
                                    {/* Sidebar Cell */}
                                    <div
                                        className="shrink-0 flex flex-col justify-center px-4 border-r border-slate-200 shadow-[4px_0_16px_rgba(0,0,0,0.02)] bg-white relative"
                                        style={{
                                            width: LEFT_COL_WIDTH,
                                            position: 'sticky',
                                            left: 0,
                                            borderLeft: `4px solid ${row.color}`,
                                            zIndex: 20
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-sm text-slate-700 break-words max-w-[160px]" title={row.ws.name}>{row.ws.name}</span>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveColorPicker(activeColorPicker === row.ws.name ? null : row.ws.name);
                                                    }}
                                                    className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                                                    style={{ color: row.color }}
                                                >
                                                    <Palette size={14} className="fill-current" />
                                                </button>
                                                {activeColorPicker === row.ws.name && (
                                                    <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-xl border border-slate-200 grid grid-cols-4 gap-1 w-[160px] cursor-default z-[60]">
                                                        {WS_PALETTE.map(color => (
                                                            <button
                                                                key={color}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setWsColors(prev => ({ ...prev, [row.ws.name]: color }));
                                                                    setActiveColorPicker(null);
                                                                }}
                                                                className="w-7 h-7 rounded-full border border-slate-200 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">{row.milestonesInWs.length} Milepæle</span>
                                        <span className="text-[10px] text-slate-400">{row.stackedDeliverables.length} Aktiviteter</span>
                                    </div>

                                    {/* Content Cell */}
                                    <div className="flex-1 relative">
                                        <div className="absolute inset-0 pointer-events-none h-full z-0">
                                            {timeMarkers.map((date, i) => {
                                                const left = ((date.getTime() - minDate) / totalDuration) * 100;
                                                return <div key={i} className="absolute h-full border-l border-slate-300/60 border-dashed" style={{ left: `${left}%` }}></div>
                                            })}
                                            {isCurrentTimeVisible && (
                                                <div
                                                    className="absolute top-0 bottom-0 border-l-2 border-red-500 border-dashed z-30"
                                                    style={{ left: `${currentLeft}%` }}
                                                />
                                            )}
                                        </div>

                                        {row.stackedDeliverables.map(d => {
                                            const isDragging = dragState?.itemType === 'deliverable' && dragState?.deliverable?.id === d.id;
                                            const currentStart = d.startMs;
                                            const currentEnd = d.endMs;

                                            const left = Math.max(0, ((currentStart - minDate) / totalDuration) * 100);
                                            const width = Math.min(100 - left, ((currentEnd - currentStart) / totalDuration) * 100);
                                            const top = HEADER_OFFSET + (d.laneIndex * (BAR_HEIGHT + BAR_GAP));

                                            return (
                                                <div
                                                    key={d.id}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    className={`absolute rounded-lg border flex flex-col justify-center px-3 shadow-sm overflow-visible transition-shadow
                                                    ${isDragging ? 'z-50 shadow-xl ring-2 ring-indigo-400 opacity-90 cursor-grabbing' : 'hover:z-10 hover:shadow-lg cursor-grab group'}
                                                `}
                                                    style={{
                                                        left: `${left}%`,
                                                        width: `${Math.max(width, 0.5)}%`,
                                                        top: `${top}px`,
                                                        height: `${BAR_HEIGHT}px`,
                                                        backgroundColor: 'white',
                                                        borderColor: row.color,
                                                        borderLeftWidth: '4px'
                                                    }}
                                                    onMouseDown={(e) => !isDragging && startDrag(e, 'move', d, d.milestoneId)}
                                                >
                                                    <div
                                                        className="absolute left-0 top-0 bottom-0 w-4 -ml-2 cursor-w-resize z-20 hover:bg-black/10 group-hover:block hidden"
                                                        onMouseDown={(e) => startDrag(e, 'resize-left', d, d.milestoneId)}
                                                    />
                                                    <div
                                                        className="absolute right-0 top-0 bottom-0 w-4 -mr-2 cursor-e-resize z-20 hover:bg-black/10 group-hover:block hidden"
                                                        onMouseDown={(e) => startDrag(e, 'resize-right', d, d.milestoneId)}
                                                    />
                                                    <div className="font-bold text-slate-800 text-sm leading-tight whitespace-normal mb-1 line-clamp-2 pointer-events-none">
                                                        {d.title}
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap overflow-hidden pointer-events-none">
                                                        <Calendar size={12} />
                                                        {new Date(currentStart).getDate()}/{new Date(currentStart).getMonth() + 1} - {new Date(currentEnd).getDate()}/{new Date(currentEnd).getMonth() + 1}
                                                    </div>
                                                    {!isDragging && (
                                                        <button
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDeliverableDetail(d.milestoneId, d);
                                                            }}
                                                            className="absolute top-1 right-1 p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded opacity-0 group-hover:opacity-100 transition-all z-30 cursor-pointer"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {row.milestonesInWs.map(m => {
                                            const mDate = new Date(m.date).getTime();
                                            const left = ((mDate - minDate) / totalDuration) * 100;
                                            const isOverdue = m.status === 'Delayed' || (new Date() > new Date(m.date) && m.status !== 'Completed');

                                            return (
                                                <div
                                                    key={m.id}
                                                    className="absolute top-0 bottom-0 flex flex-col items-center z-10 pointer-events-none"
                                                    style={{ left: `${left}%` }}
                                                >
                                                    <div className="absolute top-3 bottom-0 w-px border-l-2 border-dashed border-slate-400/50"></div>
                                                    <div
                                                        onClick={() => openEditMilestone(m)}
                                                        style={{
                                                            marginTop: '12px',
                                                            backgroundColor: m.status === 'Completed' ? '#10b981' : (isOverdue ? '#ef4444' : row.color),
                                                            borderColor: 'white'
                                                        }}
                                                        className="pointer-events-auto relative z-20 w-6 h-6 rotate-45 border-2 shadow-md transition-all duration-200 cursor-pointer hover:scale-125"
                                                    ></div>
                                                    <div
                                                        style={{ marginTop: '-40px' }}
                                                        className="pointer-events-auto absolute bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity z-30 cursor-default shadow-lg font-medium"
                                                    >
                                                        {m.title} ({new Date(m.date).toLocaleDateString('da-DK')})
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {rows.length === 0 && (
                                <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                                    <GanttChart size={40} className="mx-auto mb-3 opacity-50" />
                                    <p>Ingen indsatser defineret endnu.</p>
                                    <button
                                        onClick={() => setWorkstreamManagerOpen(true)}
                                        className="mt-4 text-indigo-600 font-medium hover:underline"
                                    >
                                        Opret den første indsats her
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {activeColorPicker && (
                    <div className="fixed inset-0 z-40" onClick={() => setActiveColorPicker(null)}></div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 animate-slide-up flex flex-col flex-1 h-full">

                {/* Header & Progress */}
                <div className="flex flex-col gap-6 p-6 border-b border-slate-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Projekt Tidsplan</h3>
                            <p className="text-sm text-slate-500">{completed} af {total} milepæle gennemført</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setGuideOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors font-medium text-sm shadow-sm mr-2"
                            >
                                <HelpCircle size={16} />
                                <span>Guide</span>
                            </button>

                            <div className="bg-slate-100 p-1 rounded-lg flex">
                                <button
                                    onClick={() => setViewMode('gantt')}
                                    className={`p-1.5 rounded transition-all ${viewMode === 'gantt' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Gantt / Svømmebaner Visning"
                                >
                                    <GanttChart size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Liste Visning"
                                >
                                    <List size={18} />
                                </button>
                            </div>

                            {/* New Workstream Manager Button */}
                            <button
                                onClick={() => setWorkstreamManagerOpen(true)}
                                className="text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                            >
                                <ArrowRight size={16} /> Administrer Indsatser
                            </button>

                            <button
                                onClick={openNewPhase}
                                className="text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                            >
                                <Layers size={16} /> Tilføj Fase
                            </button>

                            <button
                                onClick={openNewDeliverable}
                                className="text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                            >
                                <Plus size={16} /> Tilføj Aktivitet
                            </button>

                            <button
                                onClick={openNewMilestone}
                                className="text-sm bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 shadow-md shadow-indigo-200"
                            >
                                <Plus size={16} /> Tilføj Milepæl
                            </button>
                        </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Conditional Views */}
                <div className="flex-1 flex flex-col min-h-0">
                    {viewMode === 'gantt' ? renderGanttView() : (
                        <div className="p-6 overflow-y-auto">
                            {/* Group milestones by workstream */}
                            {(() => {
                                const workstreams = project.workstreams || [];
                                const milestonesByWs: Record<string, Milestone[]> = {};
                                const unassignedMilestones: Milestone[] = [];

                                sortedMilestones.forEach(m => {
                                    if (m.workstream) {
                                        if (!milestonesByWs[m.workstream]) milestonesByWs[m.workstream] = [];
                                        milestonesByWs[m.workstream].push(m);
                                    } else {
                                        unassignedMilestones.push(m);
                                    }
                                });

                                // Create display order: defined workstreams first, then others found in milestones, then unassigned
                                const displayGroups = [
                                    ...workstreams.map(ws => ({ name: ws.name, milestones: milestonesByWs[ws.name] || [] })),
                                    ...Object.keys(milestonesByWs)
                                        .filter(name => !workstreams.some(ws => ws.name === name))
                                        .map(name => ({ name, milestones: milestonesByWs[name] })),
                                    { name: 'Unassigned', milestones: unassignedMilestones }
                                ].filter(g => g.milestones.length > 0);

                                return displayGroups.map((group) => (
                                    <div key={group.name} className="mb-8">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 pl-4 border-l-4 border-indigo-500">
                                            {group.name === 'Unassigned' ? 'Uden Indsats' : group.name}
                                        </h3>
                                        <div className="relative pl-4 space-y-8">
                                            <div className="absolute left-7 top-2 bottom-2 w-0.5 bg-slate-100" />
                                            {group.milestones.map((milestone) => (
                                                <div key={milestone.id} className="relative flex items-start gap-6 group">
                                                    <div className={`relative z-10 p-1 bg-white rounded-full border-2 transition-all duration-300 group-hover:scale-110
                                           ${milestone.status === 'Delayed' ? 'border-red-100 shadow-red-100' :
                                                            milestone.status === 'Completed' ? 'border-green-100 shadow-green-100' :
                                                                'border-slate-100 shadow-slate-100'} shadow-lg`}>
                                                        {getStatusIcon(milestone.status)}
                                                    </div>
                                                    <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm group-hover:border-indigo-200 group-hover:shadow-md transition-all relative">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="text-base font-semibold text-slate-900">{milestone.title}</h4>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar size={14} />
                                                                        {new Date(milestone.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                    </span>
                                                                    {getDaysLabel(milestone.date)}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(milestone.status)}`}>
                                                                    {translateStatus(milestone.status)}
                                                                </span>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => openEditMilestone(milestone)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button onClick={() => onDeleteMilestone(milestone.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Deliverables List */}
                                                        <div className="space-y-2">
                                                            {milestone.deliverables?.map((deliverable) => (
                                                                <div key={deliverable.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors group/item">
                                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${deliverable.status === 'Completed' ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                                        <span className={`text-sm font-medium truncate ${deliverable.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                                            {deliverable.title}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                                                        {/* Owner */}
                                                                        <div className="flex items-center gap-1 min-w-[120px]">
                                                                            {deliverable.owner ? (
                                                                                <>
                                                                                    <User size={14} className="text-slate-400" />
                                                                                    <span className="truncate max-w-[100px]">{deliverable.owner}</span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-slate-300 italic text-xs">Ingen ejer</span>
                                                                            )}
                                                                        </div>

                                                                        {/* Dates */}
                                                                        <div className="flex items-center gap-1 min-w-[140px]">
                                                                            {(deliverable.startDate || deliverable.endDate) ? (
                                                                                <>
                                                                                    <Calendar size={14} className="text-slate-400" />
                                                                                    <span className="text-xs">
                                                                                        {deliverable.startDate ? new Date(deliverable.startDate).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) : '...'}
                                                                                        {' - '}
                                                                                        {deliverable.endDate ? new Date(deliverable.endDate).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) : '...'}
                                                                                    </span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-slate-300 italic text-xs">Ingen datoer</span>
                                                                            )}
                                                                        </div>

                                                                        {/* Status Badge */}
                                                                        <div className={`text-xs px-2 py-0.5 rounded border ${deliverable.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                            deliverable.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                                'bg-slate-100 text-slate-600 border-slate-200'
                                                                            }`}>
                                                                            {translateStatus(deliverable.status || 'Pending')}
                                                                        </div>

                                                                        {/* Actions */}
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity w-[50px] justify-end">
                                                                            <button onClick={() => openDeliverableDetail(milestone.id, deliverable)} className="p-1 text-slate-400 hover:text-indigo-600 rounded">
                                                                                <Edit2 size={14} />
                                                                            </button>
                                                                            <button onClick={() => onDeleteDeliverable(milestone.id, deliverable.id)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Inline Add Deliverable */}
                                                            {addingToMilestone === milestone.id ? (
                                                                <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        value={newDeliverableText}
                                                                        onChange={(e) => setNewDeliverableText(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleInlineAddDeliverable(milestone.id);
                                                                            if (e.key === 'Escape') {
                                                                                setAddingToMilestone(null);
                                                                                setNewDeliverableText('');
                                                                            }
                                                                        }}
                                                                        placeholder="Hvad skal leveres?"
                                                                        className="flex-1 px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                                    />
                                                                    <button
                                                                        onClick={() => handleInlineAddDeliverable(milestone.id)}
                                                                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                                                    >
                                                                        <Check size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setAddingToMilestone(null);
                                                                            setNewDeliverableText('');
                                                                        }}
                                                                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setAddingToMilestone(milestone.id)}
                                                                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-600 transition-colors mt-2 px-2 py-1 rounded hover:bg-indigo-50 w-full text-left"
                                                                >
                                                                    <Plus size={14} /> Tilføj aktivitet
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </div>
            </div>

            <NewMilestoneModal
                isOpen={isMilestoneModalOpen}
                onClose={() => setMilestoneModalOpen(false)}
                onSave={handleMilestoneModalSave}
                milestoneToEdit={milestoneToEdit}
                projectWorkstreams={project.workstreams}
            />

            <NewPhaseModal
                isOpen={isPhaseModalOpen}
                onClose={() => setPhaseModalOpen(false)}
                onSave={handlePhaseModalSave}
                phaseToEdit={phaseToEdit}
            />

            <DeliverableDetailModal
                isOpen={isDeliverableModalOpen}
                onClose={() => { setDeliverableModalOpen(false); setIsGlobalAddDeliverable(false); }}
                onSave={handleDeliverableModalSave}
                deliverable={deliverableToEdit?.data || null}
                milestoneTitle={project.milestones.find(m => m.id === deliverableToEdit?.milestoneId)?.title || ''}
                milestones={isGlobalAddDeliverable ? project.milestones : undefined}
                projectMembers={projectMembers}
            />

            <ProjectGuideModal
                isOpen={isGuideOpen}
                onClose={() => setGuideOpen(false)}
            />

            <WorkstreamManagerModal
                isOpen={isWorkstreamManagerOpen}
                onClose={() => setWorkstreamManagerOpen(false)}
                workstreams={project.workstreams}
                onSave={onSaveWorkstream}
                onDelete={onDeleteWorkstream}
            />
        </>
    );
};
