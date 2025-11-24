
import React, { useState, useEffect } from 'react';
import { X, Layers, PenTool, Loader2 } from 'lucide-react';
import { Phase } from '../../../types/milestone-plan';

interface NewPhaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (phase: Omit<Phase, 'id'>) => Promise<void>;
    phaseToEdit?: Phase | null;
}

export const NewPhaseModal: React.FC<NewPhaseModalProps> = ({ isOpen, onClose, onSave, phaseToEdit }) => {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState<Phase['status']>('Planned');
    const [color, setColor] = useState('#e2e8f0');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && phaseToEdit) {
            setName(phaseToEdit.name);
            setStartDate(phaseToEdit.startDate);
            setEndDate(phaseToEdit.endDate);
            setStatus(phaseToEdit.status);
            setColor(phaseToEdit.color || '#e2e8f0');
        } else if (isOpen) {
            setName('');
            setStartDate('');
            setEndDate('');
            setStatus('Planned');
            setColor('#e2e8f0');
        }
        setIsSaving(false);
    }, [isOpen, phaseToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({ name, startDate, endDate, status, color });
            onClose();
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${phaseToEdit ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {phaseToEdit ? <PenTool size={20} /> : <Layers size={20} />}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {phaseToEdit ? 'Rediger Fase' : 'Tilføj Projektfase'}
                        </h2>
                    </div>
                    <button onClick={onClose} disabled={isSaving} className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fasenavn</label>
                        <input
                            required
                            disabled={isSaving}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50"
                            placeholder="f.eks. Planlægning, Udvikling"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Startdato</label>
                            <input
                                required
                                disabled={isSaving}
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Slutdato</label>
                            <input
                                required
                                disabled={isSaving}
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select
                            value={status}
                            disabled={isSaving}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50"
                        >
                            <option value="Planned">Planlagt</option>
                            <option value="Active">Aktiv</option>
                            <option value="Completed">Gennemført</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Farve</label>
                        <div className="flex flex-wrap gap-2">
                            {['#e2e8f0', '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fae8ff'].map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
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
                            {phaseToEdit ? 'Gem Ændringer' : 'Tilføj Fase'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
