
import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowRight, Edit2, Check, AlertTriangle } from 'lucide-react';
import { Workstream } from '../../../types/milestone-plan';

interface WorkstreamManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    workstreams: Workstream[];
    onSave: (workstream: Workstream) => void;
    onDelete: (id: string) => void;
}

export const WorkstreamManagerModal: React.FC<WorkstreamManagerModalProps> = ({
    isOpen,
    onClose,
    workstreams,
    onSave,
    onDelete
}) => {
    const [newWorkstreamName, setNewWorkstreamName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newWorkstreamName.trim()) {
            onSave({
                id: crypto.randomUUID(),
                name: newWorkstreamName.trim()
            });
            setNewWorkstreamName('');
        }
    };

    const startEdit = (ws: Workstream) => {
        setEditingId(ws.id);
        setEditName(ws.name);
        setConfirmDeleteId(null);
    };

    const saveEdit = () => {
        if (editingId && editName.trim()) {
            onSave({
                id: editingId,
                name: editName.trim()
            });
            setEditingId(null);
            setEditName('');
        }
    };

    const handleDeleteClick = (id: string) => {
        if (confirmDeleteId === id) {
            onDelete(id);
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(id);
            // Reset confirmation after 3 seconds
            setTimeout(() => {
                setConfirmDeleteId(prev => prev === id ? null : prev);
            }, 3000);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <ArrowRight size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Administrer Indsatser</h2>
                            <p className="text-xs text-slate-500">Opret og rediger projektets spor</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Add New */}
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input
                            type="text"
                            value={newWorkstreamName}
                            onChange={(e) => setNewWorkstreamName(e.target.value)}
                            placeholder="Ny indsats (f.eks. Marketing)"
                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!newWorkstreamName.trim()}
                            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </form>

                    {/* List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {workstreams.length === 0 && (
                            <p className="text-center text-slate-400 text-sm py-4 italic">Ingen indsatser oprettet endnu.</p>
                        )}

                        {workstreams.map(ws => (
                            <div key={ws.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">

                                {editingId === ws.id ? (
                                    <div className="flex-1 flex items-center gap-2 mr-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={saveEdit}
                                            className="text-green-600 hover:bg-green-100 p-1 rounded"
                                        >
                                            <Check size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                                        <span className="text-sm font-medium text-slate-700">{ws.name}</span>
                                    </div>
                                )}

                                <div className="flex gap-1 items-center">
                                    {editingId !== ws.id && (
                                        <button
                                            type="button"
                                            onClick={() => startEdit(ws)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(ws.id);
                                        }}
                                        className={`p-1.5 rounded transition-all flex items-center gap-1 
                            ${confirmDeleteId === ws.id
                                                ? 'bg-red-100 text-red-700 w-auto px-2'
                                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                    >
                                        {confirmDeleteId === ws.id ? (
                                            <>
                                                <span className="text-xs font-bold">Bekræft?</span>
                                                <Trash2 size={12} />
                                            </>
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        Luk
                    </button>
                </div>
            </div>
        </div>
    );
};
