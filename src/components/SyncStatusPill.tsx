type SyncStatusPillProps = {
  message: string;
  className?: string;
};

export const SyncStatusPill = ({ message, className }: SyncStatusPillProps) => (
  <div
    role="status"
    aria-live="polite"
    className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ${className ?? ''}`}
  >
    <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" aria-hidden="true" />
    {message}
  </div>
);

export default SyncStatusPill;
