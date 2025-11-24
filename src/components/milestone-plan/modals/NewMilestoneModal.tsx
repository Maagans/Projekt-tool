
import React, { useState, useEffect } from 'react';
import { X, Flag, Plus, Trash2, PenTool, Loader2, Layers, ChevronDown } from 'lucide-react';
import { Milestone, Deliverable, Workstream } from '../../../types/milestone-plan';

interface NewMilestoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (milestone: Omit<Milestone, 'id'>) => Promise<void>;
    milestoneToEdit?: Milestone | null;
    projectWorkstreams: Workstream[];
}

export const NewMilestoneModal: React.FC<NewMilestoneModalProps> = ({
    isOpen,
    onClose,
    onSave,
    milestoneToEdit,
    projectWorkstreams
}) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [status, setStatus] = useState<Milestone['status']>('Pending');
    const [workstream, setWorkstream] = useState('');
    const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
    const [currentDeliverableText, setCurrentDeliverableText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && milestoneToEdit) {
            setTitle(milestoneToEdit.title);
            setDate(milestoneToEdit.date);
            setStatus(milestoneToEdit.status);
            setWorkstream(milestoneToEdit.workstream || '');
            setDeliverables(milestoneToEdit.deliverables ? [...milestoneToEdit.deliverables] : []);
        } else if (isOpen) {
            setTitle('');
            setDate('');
            setStatus('Pending');
            // Default to first workstream if available
            setWorkstream(projectWorkstreams.length > 0 ? projectWorkstreams[0].name : '');
            setDeliverables([]);
        }
        setCurrentDeliverableText('');
        setIsSaving(false);
    }, [isOpen, milestoneToEdit, projectWorkstreams]);

    if (!isOpen) return null;

    const handleAddDeliverable = () => {
        if (currentDeliverableText.trim()) {
            const newDeliverable: Deliverable = {
                id: crypto.randomUUID(),
                title: currentDeliverableText.trim(),
                status: 'Pending',
                checklist: [],
                owner: 'Unassigned'
            };
            setDeliverables([...deliverables, newDeliverable]);
            setCurrentDeliverableText('');
        }
    };

    const handleRemoveDeliverable = (index: number) => {
        setDeliverables(deliverables.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                title,
                date,
                status,
                workstream, // Save the name string
                deliverables
            });
            onClose();
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${milestoneToEdit ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {milestoneToEdit ? <PenTool size={20} /> : <Flag size={20} />}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {milestoneToEdit ? 'Rediger Milepæl' : 'Ny Milepæl'}
                        </h2>
                    </div>
                    <button disabled={isSaving} onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Titel</label>
                        <input
                            required
                            disabled={isSaving}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50"
                            placeholder="f.eks. Fase 1 Godkendelse"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dato</label>
                            <input
                                required
                                disabled={isSaving}
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select
                                value={status}
                                disabled={isSaving}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50"
                            >
                                <option value="Pending">Afventer</option>
                                <option value="On Track">I Rute</option>
                                <option value="Delayed">Forsinket</option>
                                <option value="Completed">Gennemført</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                            <Layers size={14} /> Indsats (Workstream)
                        </label>
                        <div className="relative">
                            <select
                                value={workstream}
                                disabled={isSaving}
                                onChange={(e) => setWorkstream(e.target.value)}
                                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 appearance-none"
                            >
                                <option value="">-- Vælg Indsats --</option>
                                {projectWorkstreams.map(ws => (
                                    <option key={ws.id} value={ws.name}>{ws.name}</option>
                                ))}
                                {/* Fallback if editing a milestone with a workstream not in list */}
                                {workstream && !projectWorkstreams.some(ws => ws.name === workstream) && (
                                    <option value={workstream}>{workstream} (Legacy)</option>
                                )}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {projectWorkstreams.length === 0
                                ? "Ingen indsatser fundet. Du kan oprette dem i Tidslinje visningen."
                                : "Vælg hvilken indsats denne milepæl tilhører."}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hurtig Tilføjelse af Aktivitet</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                disabled={isSaving}
                                value={currentDeliverableText}
                                onChange={(e) => setCurrentDeliverableText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddDeliverable();
                                    }
                                }}
                                className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:bg-slate-50"
                                placeholder="Tilføj en nøgleaktivitet..."
                            />
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={handleAddDeliverable}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {deliverables.length > 0 && (
                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-2 space-y-1 max-h-32 overflow-y-auto">
                                {deliverables.map((d, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 text-sm group">
                                        <span className="text-slate-700 truncate">{d.title}</span>
                                        <button
                                            type="button"
                                            disabled={isSaving}
                                            onClick={() => handleRemoveDeliverable(i)}
                                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            Annuller
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-70"
                        >
                            {isSaving && <Loader2 className="animate-spin" size={16} />}
                            {milestoneToEdit ? 'Gem Ændringer' : 'Tilføj Milepæl'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
