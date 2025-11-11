type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
  <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
    <div className="font-semibold">Kunne ikke hente ressourcedata</div>
    <p className="text-sm text-rose-600">{message}</p>
    <button
      onClick={onRetry}
      className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-400"
    >
      Prøv igen
    </button>
  </div>
);
