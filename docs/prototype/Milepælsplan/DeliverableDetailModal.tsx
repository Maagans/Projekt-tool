
import React, { useState, useEffect } from 'react';
import { X, Box, CheckSquare, User, AlignLeft, FileText, Plus, Trash2, CheckCircle2, Circle, Loader2, Calendar } from 'lucide-react';
import { Deliverable, ChecklistItem } from './types';

interface DeliverableDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deliverable: Deliverable) => Promise<void>;
  deliverable: Deliverable | null;
  milestoneTitle: string;
}

export const DeliverableDetailModal: React.FC<DeliverableDetailModalProps> = ({ isOpen, onClose, onSave, deliverable, milestoneTitle }) => {
  const [data, setData] = useState<Deliverable | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && deliverable) {
      setData({ 
        ...deliverable,
        checklist: deliverable.checklist || [] 
      });
    } else {
        setData(null);
    }
    setNewChecklistItem('');
    setIsSaving(false);
  }, [isOpen, deliverable]);

  if (!isOpen || !data) return null;

  const handleSave = async () => {
    if (data) {
      setIsSaving(true);
      try {
          await onSave(data);
          onClose();
      } catch (e) {
          console.error(e);
      } finally {
          setIsSaving(false);
      }
    }
  };

  const handleAddChecklistItem = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newChecklistItem.trim()) return;
    
    const newItem: ChecklistItem = {
        id: `cl-${Date.now()}`,
        text: newChecklistItem,
        completed: false
    };

    setData({
        ...data,
        checklist: [...(data.checklist || []), newItem]
    });
    setNewChecklistItem('');
  };

  const toggleChecklistItem = (id: string) => {
      if (!data.checklist) return;
      const updated = data.checklist.map(item => 
          item.id === id ? { ...item, completed: !item.completed } : item
      );
      setData({ ...data, checklist: updated });
  };

  const removeChecklistItem = (id: string) => {
      if (!data.checklist) return;
      setData({ ...data, checklist: data.checklist.filter(item => item.id !== id) });
  };
  
  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'Pending': return 'Afventer';
          case 'In Progress': return 'I Gang';
          case 'Completed': return 'Gennemført';
          default: return status;
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
          <div>
             <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Box size={16} />
                <span>Aktivitets / Leverance Detaljer</span>
                <span className="text-slate-300">/</span>
                <span className="font-medium text-indigo-600">{milestoneTitle}</span>
             </div>
             <input 
                type="text" 
                disabled={isSaving}
                value={data.title}
                onChange={(e) => setData({...data, title: e.target.value})}
                className="text-xl font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 w-full placeholder-slate-400 disabled:opacity-70"
                placeholder="Aktivitetstitel"
             />
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Dates Row (Activity Duration) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                    <Calendar size={16} className="text-blue-600"/> Varighed (Tidsramme)
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-xs text-slate-500 block mb-1">Startdato</span>
                        <input 
                            type="date"
                            disabled={isSaving}
                            value={data.startDate || ''}
                            onChange={(e) => setData({...data, startDate: e.target.value})}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:bg-slate-50"
                        />
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 block mb-1">Slutdato</span>
                        <input 
                            type="date"
                            disabled={isSaving}
                            value={data.endDate || ''}
                            onChange={(e) => setData({...data, endDate: e.target.value})}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:bg-slate-50"
                        />
                    </div>
                </div>
            </div>

            {/* Status & Owner Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                        <CheckCircle2 size={16} className="text-green-600"/> Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {(['Pending', 'In Progress', 'Completed'] as const).map((s) => (
                            <button
                                key={s}
                                disabled={isSaving}
                                onClick={() => setData({...data, status: s})}
                                className={`flex-1 min-w-[80px] py-2 px-2 rounded-lg text-xs font-medium transition-all border whitespace-nowrap
                                ${data.status === s 
                                    ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm' 
                                    : 'bg-slate-100 border-transparent text-slate-500 hover:bg-white'} disabled:opacity-50`}
                            >
                                {getStatusLabel(s)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                        <User size={16} className="text-blue-600"/> Ansvarlig (Ejer)
                    </label>
                    <input 
                        type="text"
                        disabled={isSaving}
                        value={data.owner || ''}
                        onChange={(e) => setData({...data, owner: e.target.value})}
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:bg-slate-50"
                        placeholder="f.eks. Jens Jensen"
                    />
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <AlignLeft size={18} className="text-slate-400"/> Beskrivelse
                </label>
                <textarea 
                    value={data.description || ''}
                    disabled={isSaving}
                    onChange={(e) => setData({...data, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none disabled:bg-slate-50"
                    placeholder="Beskriv kravene til aktiviteten..."
                />
            </div>

            {/* Checklist */}
            <div>
                <div className="flex justify-between items-end mb-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <CheckSquare size={18} className="text-slate-400"/> Tjekliste
                    </label>
                    <span className="text-xs text-slate-400">
                        {data.checklist?.filter(i => i.completed).length}/{data.checklist?.length} udført
                    </span>
                </div>
                
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-2 space-y-1">
                        {data.checklist?.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                                <button 
                                    disabled={isSaving}
                                    onClick={() => toggleChecklistItem(item.id)}
                                    className={`shrink-0 transition-colors ${item.completed ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'} disabled:opacity-50`}
                                >
                                    {item.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                </button>
                                <span className={`flex-1 text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                    {item.text}
                                </span>
                                <button 
                                    disabled={isSaving}
                                    onClick={() => removeChecklistItem(item.id)}
                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2 disabled:hidden"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {(!data.checklist || data.checklist.length === 0) && (
                            <div className="p-4 text-center text-xs text-slate-400 italic">
                                Ingen punkter på tjeklisten. Tilføj et nedenfor.
                            </div>
                        )}
                    </div>
                    
                    <form onSubmit={handleAddChecklistItem} className="p-3 bg-slate-100 border-t border-slate-200 flex gap-2">
                        <input 
                            type="text"
                            disabled={isSaving}
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            placeholder="Tilføj punkt..."
                            className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50"
                        />
                        <button 
                            type="submit"
                            disabled={!newChecklistItem.trim() || isSaving}
                            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </form>
                </div>
            </div>

            {/* Notes */}
            <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <FileText size={18} className="text-slate-400"/> Interne Noter
                </label>
                <textarea 
                    value={data.notes || ''}
                    disabled={isSaving}
                    onChange={(e) => setData({...data, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-slate-700 text-sm resize-none disabled:opacity-50"
                    placeholder="Private noter, påmindelser eller links..."
                />
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50">
                Annuller
            </button>
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-70"
            >
                {isSaving && <Loader2 className="animate-spin" size={16} />}
                Gem Aktivitet
            </button>
        </div>
      </div>
    </div>
  );
};
