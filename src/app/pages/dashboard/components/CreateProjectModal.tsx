import { useState, useRef, useEffect, FormEvent } from 'react';

type CreateProjectModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, startDate: string, endDate: string) => void;
};

export const CreateProjectModal = ({ isOpen, onClose, onCreate }: CreateProjectModalProps) => {
    const [projectName, setProjectName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Set default dates when modal opens
    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const sixMonthsLater = new Date();
            sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

            setStartDate(today.toISOString().split('T')[0]);
            setEndDate(sixMonthsLater.toISOString().split('T')[0]);
            setProjectName('');
            setError(null);

            // Focus input after a short delay
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    // Close on click outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const trimmedName = projectName.trim();
        if (!trimmedName) {
            setError('Projektnavn er påkrævet');
            return;
        }

        if (!startDate) {
            setError('Startdato er påkrævet');
            return;
        }

        if (!endDate) {
            setError('Slutdato er påkrævet');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError('Startdato skal være før slutdato');
            return;
        }

        onCreate(trimmedName, startDate, endDate);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-project-title"
                className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
                    <h2 id="create-project-title" className="text-xl font-bold text-white">
                        Opret nyt projekt
                    </h2>
                    <p className="text-teal-100 text-sm mt-1">
                        Udfyld projektets grundlæggende oplysninger
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="project-name" className="block text-sm font-medium text-slate-700 mb-1">
                            Projektnavn <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={inputRef}
                            id="project-name"
                            type="text"
                            value={projectName}
                            onChange={(e) => {
                                setProjectName(e.target.value);
                                setError(null);
                            }}
                            placeholder="Indtast projektnavn..."
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1">
                                Startdato <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setError(null);
                                }}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                style={{ colorScheme: 'light' }}
                            />
                        </div>
                        <div>
                            <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1">
                                Slutdato <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setError(null);
                                }}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                style={{ colorScheme: 'light' }}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                            Annuller
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                        >
                            Opret projekt
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
