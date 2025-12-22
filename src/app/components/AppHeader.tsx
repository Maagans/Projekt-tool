import type { ReactNode } from 'react';
import type { User } from '../../types';
import { LogOutIcon, SignalIcon, UserIcon } from '../../components/Icons';

type AppHeaderProps = {
  title: string;
  user: User | null;
  isSaving: boolean;
  isRefreshing?: boolean;
  apiError: string | null;
  onLogout: () => void;
  children?: ReactNode;
};

export const AppHeader = ({ title, user, isSaving, isRefreshing = false, apiError, onLogout, children }: AppHeaderProps) => {
  const hasSyncActivity = isSaving || isRefreshing;
  const statusLabel = apiError
    ? 'Forbindelse mistet'
    : isSaving
      ? 'Synkroniserer...'
      : isRefreshing
        ? 'Opdaterer data...'
        : 'Synkroniseret';
  const statusCircleClasses = apiError
    ? 'border-red-300 text-red-600 bg-red-100'
    : hasSyncActivity
      ? 'border-amber-300 text-amber-600 bg-amber-100'
      : 'border-green-300 text-green-600 bg-green-100';
  const statusLabelClasses = apiError ? 'text-red-600' : hasSyncActivity ? 'text-amber-600' : 'text-green-600';
  const haloClasses = apiError ? 'bg-red-400/60 animate-ping' : hasSyncActivity ? 'bg-amber-300/60 animate-pulse' : '';
  const showHalo = Boolean(haloClasses);

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-blue-500/5 backdrop-blur export-hide">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {children}
        <div className="flex items-center gap-3 text-sm" title={apiError || 'API Status'}>
          <span className="relative flex items-center justify-center">
            {showHalo && <span className={`absolute inline-flex h-11 w-11 rounded-full ${haloClasses}`}></span>}
            <span className={`relative flex h-11 w-11 items-center justify-center rounded-full border ${statusCircleClasses}`}>
              <SignalIcon />
            </span>
          </span>
          <span className={`font-semibold ${statusLabelClasses} ${isSaving && !apiError ? 'animate-pulse' : ''}`} aria-live="polite">
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 shadow-inner">
            <UserIcon />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
            <div className="text-xs text-slate-500">
              {user?.email} ({user?.role})
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log ud"
            className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOutIcon />
          </button>
        </div>
      </div>
    </header>
  );
};
