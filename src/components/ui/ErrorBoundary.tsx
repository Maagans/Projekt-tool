import React from 'react';

export type ErrorBoundaryFallbackRender = (props: { reset: () => void }) => React.ReactNode;

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ErrorBoundaryFallbackRender;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (typeof window !== 'undefined') {
      console.error('Unhandled UI error', error, errorInfo);
    }
    this.props.onError?.(error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback({ reset: this.reset });
      }
      if (fallback) {
        return fallback;
      }
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-lg">
            <h1 className="text-2xl font-semibold text-red-600 mb-2">Noget gik galt</h1>
            <p className="text-sm text-slate-600 mb-6">
              Applikationen oplevede en uventet fejl. Genindlæs siden for at forsøge igen.
            </p>
            <button
              onClick={() => {
                this.reset();
                window.location.reload();
              }}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Genindlæs
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
