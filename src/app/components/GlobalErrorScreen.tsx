type GlobalErrorScreenProps = {
  onRetry: () => void;
  onReload: () => void;
};

export const GlobalErrorScreen = ({ onRetry, onReload }: GlobalErrorScreenProps) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
    <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl">
      <div className="mb-6 text-4xl">😵</div>
      <h2 className="mb-3 text-2xl font-semibold text-slate-800">Noget gik galt</h2>
      <p className="mb-8 text-slate-600">
        Applikationen stødte på en uventet fejl. Prøv igen, eller genindlæs siden hvis problemet fortsætter.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onRetry}
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Forsøg igen
        </button>
        <button
          onClick={onReload}
          className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Genindlæs
        </button>
      </div>
    </div>
  </div>
);

