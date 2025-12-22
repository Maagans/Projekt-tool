import { useEffect, useRef } from 'react';

interface SessionTimeoutModalProps {
    secondsRemaining: number;
    onExtend: () => void;
    onLogout: () => void;
}

/**
 * Modal component that warns users before their session expires.
 * Displays a countdown timer and options to extend or log out.
 */
export const SessionTimeoutModal = ({
    secondsRemaining,
    onExtend,
    onLogout,
}: SessionTimeoutModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Format seconds as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Focus trap and keyboard handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        modalRef.current?.focus();

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                ref={modalRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="session-timeout-title"
                aria-describedby="session-timeout-description"
                tabIndex={-1}
                className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Warning Icon */}
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                    <svg
                        className="h-8 w-8 text-amber-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h2
                    id="session-timeout-title"
                    className="mb-2 text-center text-xl font-semibold text-slate-800"
                >
                    Din session udløber snart
                </h2>

                {/* Description */}
                <p
                    id="session-timeout-description"
                    className="mb-6 text-center text-slate-600"
                >
                    Af sikkerhedsmæssige årsager logges du automatisk ud om:
                </p>

                {/* Countdown Timer */}
                <div className="mb-6 text-center">
                    <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-6 py-3 font-mono text-3xl font-bold text-slate-800">
                        {formatTime(secondsRemaining)}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        onClick={onExtend}
                        className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Forlæng session
                    </button>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                    >
                        Log ud nu
                    </button>
                </div>

                <p className="mt-4 text-center text-sm text-slate-500">
                    Klik på &quot;Forlæng session&quot; for at fortsætte dit arbejde.
                </p>
            </div>
        </div>
    );
};
