import { useState } from 'react';
import type React from 'react';

type GlobalErrorScreenProps = {
  onRetry: () => void;
  onReload: () => void;
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
};

// Check if running in development mode
const isDevelopment = import.meta.env.DEV;

// Categorize errors for contextual messaging
const getErrorContext = (error: Error | null | undefined): { title: string; message: string; isRetryable: boolean } => {
  if (!error) {
    return {
      title: 'Noget gik galt',
      message: 'Applikationen stødte på en uventet fejl. Prøv igen, eller genindlæs siden hvis problemet fortsætter.',
      isRetryable: true,
    };
  }

  const errorMessage = error.message?.toLowerCase() ?? '';
  const errorName = error.name?.toLowerCase() ?? '';

  // Network/API errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
    return {
      title: 'Forbindelsesfejl',
      message: 'Der kunne ikke oprettes forbindelse til serveren. Kontrollér din internetforbindelse og prøv igen.',
      isRetryable: true,
    };
  }

  // Authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorMessage.includes('authentication')) {
    return {
      title: 'Session udløbet',
      message: 'Din session er udløbet. Log venligst ind igen for at fortsætte.',
      isRetryable: false,
    };
  }

  // Permission errors
  if (errorMessage.includes('forbidden') || errorMessage.includes('403') || errorMessage.includes('permission')) {
    return {
      title: 'Adgang nægtet',
      message: 'Du har ikke tilladelse til at udføre denne handling. Kontakt en administrator hvis du mener dette er en fejl.',
      isRetryable: false,
    };
  }

  // Chunk loading errors (lazy loading failures)
  if (errorName.includes('chunkloaderror') || errorMessage.includes('loading chunk')) {
    return {
      title: 'Indlæsningsfejl',
      message: 'En del af applikationen kunne ikke indlæses. Dette kan skyldes en opdatering. Prøv at genindlæse siden.',
      isRetryable: true,
    };
  }

  // Type/Reference errors (usually code bugs)
  if (errorName.includes('typeerror') || errorName.includes('referenceerror')) {
    return {
      title: 'Applikationsfejl',
      message: 'Der opstod en intern fejl i applikationen. Vores team er blevet underrettet. Prøv at genindlæse siden.',
      isRetryable: true,
    };
  }

  // Default
  return {
    title: 'Noget gik galt',
    message: 'Applikationen stødte på en uventet fejl. Prøv igen, eller genindlæs siden hvis problemet fortsætter.',
    isRetryable: true,
  };
};

export const GlobalErrorScreen = ({ onRetry, onReload, error, errorInfo }: GlobalErrorScreenProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const { title, message, isRetryable } = getErrorContext(error);

  const handleGoToDashboard = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl">
        {/* Error Icon */}
        <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className="mb-3 text-2xl font-semibold text-slate-800">{title}</h2>

        {/* Error Message */}
        <p className="mb-8 text-slate-600">{message}</p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isRetryable && (
            <button
              onClick={onRetry}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Forsøg igen
            </button>
          )}
          <button
            onClick={onReload}
            className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Genindlæs siden
          </button>
          <button
            onClick={handleGoToDashboard}
            className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Gå til forsiden
          </button>
        </div>

        {/* Developer Details (only in dev mode) */}
        {isDevelopment && error && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              {showDetails ? 'Skjul tekniske detaljer' : 'Vis tekniske detaljer'}
            </button>

            {showDetails && (
              <div className="mt-4 text-left">
                <div className="rounded-lg bg-slate-100 p-4 overflow-auto max-h-64">
                  <p className="text-sm font-mono text-red-600 mb-2">
                    {error.name}: {error.message}
                  </p>
                  {error.stack && (
                    <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap break-words">
                      {error.stack}
                    </pre>
                  )}
                  {errorInfo?.componentStack && (
                    <>
                      <p className="text-sm font-semibold text-slate-700 mt-4 mb-2">Component Stack:</p>
                      <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap break-words">
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
