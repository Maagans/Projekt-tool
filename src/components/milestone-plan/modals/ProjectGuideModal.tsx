
import React from 'react';
import { X, Layers, Clock, ArrowRight, GitCommit } from 'lucide-react';
/* eslint-disable react/no-unescaped-entities */

interface ProjectGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectGuideModal: React.FC<ProjectGuideModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Layers className="text-indigo-200" />
                            Projekt Begreber
                        </h2>
                        <p className="text-indigo-100 text-sm opacity-90">En hurtig guide til planlÃ¦gningens byggeklodser.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={24} className="text-white" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* 1. Fase (Phases) */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-slate-100 rounded-lg text-slate-600 border border-slate-200">
                                    <Layers size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">1. Faser (Phases)</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-4 min-h-[40px]">
                                Det overordnede kapitel i projektet. En fase definerer en tidsperiode, f.eks. &quot;Design&quot; eller &quot;Udvikling&quot;.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Visuelt i planen:</div>
                                <div className="bg-slate-200 border border-slate-300 text-slate-600 text-xs font-bold px-3 py-1.5 rounded text-center w-full shadow-sm">
                                    Design Fase (Jan - Mar)
                                </div>
                            </div>
                        </div>

                        {/* 2. Indsats (Workstream) */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white border border-dashed border-slate-300 rounded-lg text-slate-500">
                                    <ArrowRight size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">2. Indsats (Workstream)</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-4 min-h-[40px]">
                                Den "bane" eller kategori arbejdet foregÃ¥r i. Det grupperer opgaver sammen, f.eks. "IT", "Jura" eller "Marketing".
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Visuelt i planen:</div>
                                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <span className="text-xs font-bold text-slate-700">Indsats: IT</span>
                                    <div className="h-px bg-slate-300 flex-1 border-dashed border-b"></div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Aktivitet (Deliverable/Activity) */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600 border border-emerald-200">
                                    <Clock size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">3. Aktivitet</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-4 min-h-[40px]">
                                Det konkrete arbejde der tager tid. Har en start- og slutdato. Det er de farvede bjÃ¦lker i planen.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Visuelt i planen:</div>
                                <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-medium px-3 py-1.5 rounded w-3/4 shadow-sm">
                                    Udarbejd kravspecifikation
                                </div>
                            </div>
                        </div>

                        {/* 4. MilepÃ¦l (Milestone) */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600 border border-indigo-200">
                                    <div className="w-5 h-5 rotate-45 bg-indigo-500"></div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">4. MilepÃ¦l</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-4 min-h-[40px]">
                                Et punkt i tiden med 0 varighed. En deadline, en beslutning eller en godkendelse. Vises som en diamant.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 relative h-16 flex items-center">
                                <div className="text-xs font-bold text-slate-400 uppercase absolute top-2 left-2">Visuelt i planen:</div>
                                <div className="absolute left-1/2 w-px h-full border-l-2 border-dashed border-slate-300"></div>
                                <div className="absolute left-1/2 -translate-x-2.5 w-5 h-5 rotate-45 bg-indigo-500 border-2 border-indigo-600 shadow-sm z-10"></div>
                            </div>
                        </div>

                    </div>

                    <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-4 items-start">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mt-1">
                            <GitCommit size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-blue-900">Hvordan hÃ¦nger det sammen?</h4>
                            <p className="text-sm text-blue-800 mt-1">
                                Du opretter <strong>MilepÃ¦le</strong> (diamanter) for at styre dine deadlines.
                                Inde i hver milepÃ¦l tilfÃ¸jer du <strong>Aktiviteter</strong> (bjÃ¦lker) for at vise arbejdet frem mod deadline.
                                Du bruger feltet <strong>"Workstream"</strong> pÃ¥ milepÃ¦len til at sortere den ned i den rigtige rÃ¦kke (Indsats).
                            </p>
                        </div>
                    </div>

                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        ForstÃ¥et, luk guiden
                    </button>
                </div>
            </div>
        </div>
    );
};














