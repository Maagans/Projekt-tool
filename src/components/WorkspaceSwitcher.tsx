/**
 * WorkspaceSwitcher Component
 * Dropdown to switch between workspaces on the dashboard
 */
import { useState, useEffect } from 'react';
import { getWorkspaces, getCurrentWorkspace, switchWorkspace, Workspace } from '../api/workspacesApi';
import { ChevronDownIcon } from './Icons';

interface WorkspaceSwitcherProps {
    className?: string;
}

export const WorkspaceSwitcher = ({ className = '' }: WorkspaceSwitcherProps) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSwitching, setIsSwitching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadWorkspaces = async () => {
            try {
                const [allWorkspaces, current] = await Promise.all([
                    getWorkspaces(),
                    getCurrentWorkspace(),
                ]);
                setWorkspaces(allWorkspaces);
                setCurrentWorkspace(current);
            } catch (err) {
                console.error('Failed to load workspaces:', err);
                setError('Kunne ikke hente workspaces');
            } finally {
                setIsLoading(false);
            }
        };
        loadWorkspaces();
    }, []);

    const handleSwitch = async (workspace: Workspace) => {
        if (workspace.id === currentWorkspace?.id) {
            setIsOpen(false);
            return;
        }

        setIsSwitching(true);
        setError(null);

        try {
            await switchWorkspace(workspace.id);
            // Reload page to get fresh data with new workspace
            window.location.reload();
        } catch (err) {
            console.error('Failed to switch workspace:', err);
            setError('Kunne ikke skifte workspace');
            setIsSwitching(false);
        }
    };

    // Show loading skeleton
    if (isLoading) {
        return (
            <div className={`animate-pulse bg-white/80 rounded-lg h-10 w-48 ${className}`} />
        );
    }

    // Show error state visually for debugging
    if (error && !currentWorkspace) {
        return (
            <div className={`px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 ${className}`}>
                {error}
            </div>
        );
    }

    const hasMultipleWorkspaces = workspaces.length > 1;

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => hasMultipleWorkspaces && setIsOpen(!isOpen)}
                disabled={isSwitching}
                className={`flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${hasMultipleWorkspaces ? 'hover:border-slate-300 hover:shadow cursor-pointer' : 'cursor-default'
                    }`}
            >
                <div className="flex flex-col items-start">
                    <span className="text-xs text-slate-400 font-medium">Workspace</span>
                    <span className="text-sm font-semibold text-slate-700">
                        {isSwitching ? 'Skifter...' : currentWorkspace?.name ?? 'Ukendt'}
                    </span>
                </div>
                {hasMultipleWorkspaces && <ChevronDownIcon />}
            </button>

            {isOpen && !isSwitching && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown - positioned to the right so it doesn't overflow */}
                    <div className="absolute top-full right-0 mt-2 min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                        <div className="p-2 border-b border-slate-100">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                Vælg workspace
                            </span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {workspaces.map((ws) => (
                                <button
                                    key={ws.id}
                                    type="button"
                                    onClick={() => handleSwitch(ws)}
                                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${ws.id === currentWorkspace?.id ? 'bg-teal-50' : ''
                                        }`}
                                >
                                    <span className={`font-medium ${ws.id === currentWorkspace?.id ? 'text-teal-700' : 'text-slate-700'
                                        }`}>
                                        {ws.name}
                                    </span>
                                    {ws.id === currentWorkspace?.id && (
                                        <span className="text-teal-600 text-sm">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}


            {error && (
                <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                </div>
            )}
        </div>
    );
};
