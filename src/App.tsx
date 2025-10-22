import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ProjectManagerProvider, useProjectManager } from './hooks/useProjectManager';
import { api } from './api';
import { EditableList } from './components/RichTextEditor';
import { MainStatusTable } from './components/MainStatusTable';
import { RiskMatrix } from './components/RiskMatrix';
import { Timeline } from './components/Timeline';
import { DeliverablesList } from './components/DeliverablesList';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectOrganizationChart } from './components/ProjectOrganizationChart';
import { locations } from './types';
import type { Employee, Location, Project, ProjectStatus, User, UserRole } from './types';
import { EditableField } from './components/EditableField';
import { StatusToast } from './components/ui/StatusToast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PlusIcon, TrashIcon, UploadIcon, UsersIcon, CalendarIcon, StepForwardIcon, DownloadIcon, LogOutIcon, ChevronDownIcon, UserIcon, SignalIcon, AnalyticsIcon } from './components/Icons';

const RESOURCES_ANALYTICS_ENABLED =
    String(import.meta.env.VITE_RESOURCES_ANALYTICS_ENABLED ?? 'false').trim().toLowerCase() === 'true';

type ProjectManagerApi = ReturnType<typeof useProjectManager>;
type ReportsManager = NonNullable<ReturnType<ProjectManagerApi['projectActions']>>['reportsManager'];

type EmployeeProjectSummary = {
    id: string;
    name: string;
    planned: number;
    actual: number;
};

type EmployeeWorkload = Employee & {
    totalPlanned: number;
    totalActual: number;
    projectDetails: EmployeeProjectSummary[];
    projectCount: number;
};

// --- MAIN APP COMPONENT ---

const AppContent: React.FC = () => {
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [showApiToast, setShowApiToast] = useState(false);
    const [page, setPage] = useState<{ name: string; projectId?: string }>({ name: 'home' });
    const projectManager = useProjectManager();
    const navigateTo = (name: string, projectId?: string) => {
        if (name === 'resources' && (!RESOURCES_ANALYTICS_ENABLED || !projectManager.isAdministrator)) {
            return;
        }
        setPage(projectId ? { name, projectId } : { name });
    };
    const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
    const { isAuthenticated, isLoading, apiError, projects, isAdministrator, canManage, needsSetup, completeSetup } = projectManager;

    useEffect(() => {
        if (apiError) {
            setShowApiToast(true);
        } else {
            setShowApiToast(false);
        }
    }, [apiError]);

    useEffect(() => {
        if (!globalError) return;
        const timeout = window.setTimeout(() => setGlobalError(null), 15000);
    return () => window.clearTimeout(timeout);
    }, [globalError]);

    const handleGlobalError = useCallback((error: Error) => {
        setGlobalError(error.message || 'Der opstod en uventet fejl.');
        setShowApiToast(false);
    }, []);

    const clearGlobalError = useCallback(() => setGlobalError(null), []);

    useEffect(() => {
        if (!isAuthenticated && page.name !== 'login') {
            setPage({ name: 'home' });
        }
    }, [isAuthenticated, page.name]);

    if (isLoading) {
    return (
            <div className="flex items-center justify-center h-screen">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        )
    }
    
    if (needsSetup) {
        return <FirstTimeSetupPage onSetupComplete={completeSetup} />;
    }

    if (!isAuthenticated) {
        if (authPage === 'login') {
            return <LoginPage onLogin={projectManager.login} onNavigateToRegister={() => setAuthPage('register')} />;
        }
        return <RegistrationPage onRegister={projectManager.register} onNavigateToLogin={() => setAuthPage('login')} />;
    }
    
    if (apiError && !projects.length) {
         return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Fejl ved indlæsning af data</h2>
                    <p className="text-slate-600">{apiError}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600">Prøv igen</button>
                </div>
            </div>
        );
    }

    const mainContent = () => {
        switch (page.name) {
            case 'project':
                return page.projectId ? <ProjectPage projectId={page.projectId} projectManager={projectManager} navigateTo={navigateTo} /> : <HomePage projectManager={projectManager} navigateTo={navigateTo} />;
            case 'employees':
                 return canManage ? <EmployeePage projectManager={projectManager} navigateTo={navigateTo} /> : <HomePage projectManager={projectManager} navigateTo={navigateTo} />;
            case 'pmo':
                return canManage ? <PmoPage projectManager={projectManager} navigateTo={navigateTo} /> : <HomePage projectManager={projectManager} navigateTo={navigateTo} />;
            case 'resources':
                return RESOURCES_ANALYTICS_ENABLED && isAdministrator
                    ? <ResourcesPlaceholder projectManager={projectManager} navigateTo={navigateTo} />
                    : <HomePage projectManager={projectManager} navigateTo={navigateTo} />;
            case 'admin':
                return isAdministrator ? <UserManagementPage projectManager={projectManager} navigateTo={navigateTo} /> : <HomePage projectManager={projectManager} navigateTo={navigateTo} />;
            default:
                return <HomePage projectManager={projectManager} navigateTo={navigateTo} />;
        }
    };
    
    return (
        <>
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
                {apiError && showApiToast && (
                    <StatusToast
                        title="Forbindelse mistet"
                        message={apiError}
                        variant="warning"
                        onClose={() => setShowApiToast(false)}
                    />
                )}
                {globalError && (
                    <StatusToast
                        title="Uventet fejl"
                        message={globalError}
                        variant="error"
                        onClose={clearGlobalError}
                    />
                )}
            </div>

            <ErrorBoundary
                onError={handleGlobalError}
                fallback={({ reset }) => (
                    <GlobalErrorScreen
                        onRetry={() => {
                            clearGlobalError();
                            reset();
                        }}
                        onReload={() => {
                            clearGlobalError();
                            reset();
                            window.location.reload();
                        }}
                    />
                )}
            >
                <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto min-h-screen">
                    {mainContent()}
                </div>
            </ErrorBoundary>
        </>
    );
};

// --- FIRST TIME SETUP PAGE ---

const FirstTimeSetupPage: React.FC<{
    onSetupComplete: () => void;
}> = ({ onSetupComplete }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);
        const result = await api.createFirstUser(name, email, password);
        if (result.success) {
            setSuccess(result.message);
            setTimeout(() => {
                onSetupComplete();
            }, 2000);
        } else {
            setError(result.message || 'Opsætning fejlede.');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Velkommen!</h1>
                    <p className="text-slate-500">Lad os oprette den første administratorkonto.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fulde Navn</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Adgangskode (min. 6 tegn)</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
                    {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">{success}</p>}
                    <div>
                        <button type="submit" disabled={isSubmitting || !!success} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-wait">
                            {isSubmitting ? 'Opretter...' : 'Opret Administratorkonto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- LOGIN PAGE ---

const LoginPage: React.FC<{ onLogin: (email: string, pass: string) => Promise<any>; onNavigateToRegister: () => void; }> = ({ onLogin, onNavigateToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        const result = await onLogin(email, password);
        if (!result.success) {
            setError(result.message || 'Login fejlede.');
        }
        setIsLoggingIn(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Projektværktøj</h1>
                    <p className="text-slate-500">Log ind for at fortsætte</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Adgangskode</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
                    <div>
                        <button type="submit" disabled={isLoggingIn} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-wait">
                            {isLoggingIn ? 'Logger ind...' : 'Log ind'}
                        </button>
                    </div>
                </form>
                <div className="mt-6 text-center text-sm text-slate-500 space-y-2">
                    <p>Har du ikke en konto? <button onClick={onNavigateToRegister} className="font-semibold text-blue-600 hover:underline">Registrer her</button></p>
                    <p className="text-slate-400">Demo: <b>projektleder@sano.dk</b> / <b>password</b></p>
                </div>
            </div>
        </div>
    );
};

// --- REGISTRATION PAGE ---
const RegistrationPage: React.FC<{
    onRegister: (email: string, name: string, pass: string) => Promise<{ success: boolean; message: string }>;
    onNavigateToLogin: () => void;
}> = ({ onRegister, onNavigateToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsRegistering(true);
        const result = await onRegister(email, name, password);
        if (result.success) {
            setSuccess(result.message);
            // Redirect to login after a short delay to show success message
            setTimeout(() => {
                onNavigateToLogin();
            }, 2000);
        } else {
            setError(result.message || 'Registrering fejlede.');
        }
        setIsRegistering(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Opret konto</h1>
                    <p className="text-slate-500">Udfyld for at registrere dig</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fulde Navn</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Adgangskode</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
                    {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">{success}</p>}
                    <div>
                        <button type="submit" disabled={isRegistering || !!success} className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-wait">
                            {isRegistering ? 'Registrerer...' : 'Opret konto'}
                        </button>
                    </div>
                </form>
                <div className="mt-6 text-center text-sm text-slate-500">
                    <p>Har du allerede en konto? <button onClick={onNavigateToLogin} className="font-semibold text-blue-600 hover:underline">Log ind her</button></p>
                </div>
            </div>
        </div>
    );
};


// --- ERROR UI ---
const GlobalErrorScreen: React.FC<{ onRetry: () => void; onReload: () => void }> = ({ onRetry, onReload }) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-lg">
            <h1 className="text-2xl font-semibold text-red-600 mb-2">Noget gik galt</h1>
            <p className="text-sm text-slate-600 mb-6">
                Et uventet problem forhindrede os i at vise indholdet. Prøv igen eller genindlæs siden.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                    onClick={onRetry}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    Prøv igen
                </button>
                <button
                    onClick={onReload}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                    Genindlæs siden
                </button>
            </div>
        </div>
    </div>
);
// --- SHARED HEADER ---
const AppHeader: React.FC<{
    title: string;
    user: User | null;
    isSaving: boolean;
    apiError: string | null;
    onLogout: () => void;
    children?: React.ReactNode;
}> = ({ title, user, isSaving, apiError, onLogout, children }) => {
    const statusLabel = apiError ? 'Forbindelse mistet' : isSaving ? 'Synkroniserer...' : 'Synkroniseret';
    const statusCircleClasses = apiError ? 'border-red-300 text-red-600 bg-red-100' : isSaving ? 'border-amber-300 text-amber-600 bg-amber-100' : 'border-green-300 text-green-600 bg-green-100';
    const statusLabelClasses = apiError ? 'text-red-600' : isSaving ? 'text-amber-600' : 'text-green-600';
    const haloClasses = apiError ? 'bg-red-400/60 animate-ping' : isSaving ? 'bg-amber-300/60 animate-pulse' : '';
    const showHalo = Boolean(haloClasses);

    return (
        <header className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap justify-between items-center gap-4 export-hide">
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <div className="flex items-center gap-4">
                {children}
                <div className="flex items-center gap-3 text-sm" title={apiError || 'API Status'}>
                    <span className="relative flex items-center justify-center">
                        {showHalo && (
                            <span className={`absolute inline-flex h-11 w-11 rounded-full ${haloClasses}`}></span>
                        )}
                        <span className={`relative flex h-11 w-11 items-center justify-center rounded-full border ${statusCircleClasses}`}>
                            <SignalIcon />
                        </span>
                    </span>
                    <span className={`font-semibold ${statusLabelClasses} ${(isSaving && !apiError) ? 'animate-pulse' : ''}`} aria-live="polite">
                        {statusLabel}
                    </span>
                </div>
                <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg">
                    <div className="w-8 h-8 grid place-items-center bg-slate-200 text-slate-600 rounded-full"><UserIcon/></div>
                    <div>
                        <div className="font-semibold text-sm text-slate-800">{user?.name}</div>
                        <div className="text-xs text-slate-500">{user?.email} ({user?.role})</div>
                    </div>
                    <button onClick={onLogout} title="Log ud" className="ml-2 text-slate-500 hover:text-red-600"><LogOutIcon /></button>
                </div>
            </div>
        </header>
    );
};


// --- PAGES ---

const HomePage: React.FC<{ projectManager: ReturnType<typeof useProjectManager>, navigateTo: (name: string, projectId?: string) => void }> = ({ projectManager, navigateTo }) => {
    const { projects, createNewProject, logout, currentUser, isSaving, apiError, canManage, isAdministrator } = projectManager;
    const [newProjectName, setNewProjectName] = useState("");
    
    const handleCreateProject = () => {
        if (!newProjectName.trim()) return;
        const newProject = createNewProject(newProjectName.trim());
        if (newProject) {
            navigateTo('project', newProject.id);
        }
        setNewProjectName("");
    };

    return (
        <div>
             <AppHeader title="Projekt Dashboard" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
                   {canManage && <button onClick={() => navigateTo('employees')} className="flex items-center gap-2 text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300 font-semibold"><UsersIcon /> Database</button>}
                   {canManage && <button onClick={() => navigateTo('pmo')} className="flex items-center gap-2 text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300 font-semibold">PMO</button>}
                   {RESOURCES_ANALYTICS_ENABLED && isAdministrator && (
                       <button
                           onClick={() => navigateTo('resources')}
                           className="flex items-center gap-2 text-sm bg-teal-200 text-teal-900 px-4 py-2 rounded-md hover:bg-teal-300 font-semibold"
                       >
                           <AnalyticsIcon /> Ressource Analytics
                       </button>
                   )}
                   {isAdministrator && <button onClick={() => navigateTo('admin')} className="flex items-center gap-2 text-sm bg-purple-200 text-purple-800 px-4 py-2 rounded-md hover:bg-purple-300 font-semibold">Admin</button>}
              </AppHeader>
            <main>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold text-slate-700 mb-4">Projekter</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map(p => (
                            <div key={p.id} onClick={() => navigateTo('project', p.id)} className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:shadow-md hover:border-blue-400 cursor-pointer transition-all">
                                <h3 className="font-bold text-lg text-slate-800">{p.config.projectName}</h3>
                                <p className="text-sm text-slate-500">{p.reports.length} rapport(er) - <span className={`font-semibold ${p.status === 'active' ? 'text-green-600' : 'text-slate-500'}`}>{p.status}</span></p>
                            </div>
                        ))}
                        {canManage && (
                            <div className="bg-slate-100/50 p-4 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2">
                                <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Nyt projektnavn..." className="bg-white text-slate-900 border border-slate-300 rounded-md p-2 text-sm w-full" onKeyDown={e => e.key === 'Enter' && handleCreateProject()} />
                                <button onClick={handleCreateProject} className="w-full flex items-center justify-center gap-1 text-sm bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600"><PlusIcon /> Opret Projekt</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

const EmployeePage: React.FC<{ projectManager: ReturnType<typeof useProjectManager>, navigateTo: (name: string, projectId?: string) => void }> = ({ projectManager, navigateTo }) => {
    const { employees, addEmployee, updateEmployee, deleteEmployee, importEmployeesFromCsv, logout, currentUser, isSaving, apiError } = projectManager;
    const [newEmployee, setNewEmployee] = useState({ name: '', location: locations[0], email: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveNewEmployee = () => {
        if (!newEmployee.name || !newEmployee.email) {
            alert("Navn og email er påkrævet.");
            return;
        }
        addEmployee(newEmployee.name, newEmployee.location, newEmployee.email);
        setNewEmployee({ name: '', location: locations[0], email: '' });
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => importEmployeesFromCsv(e.target?.result as string);
        reader.readAsText(file);
        event.target.value = '';
    };

    return (
        <div>
            <AppHeader title="Medarbejderdatabase" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
                <button onClick={() => navigateTo('home')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">Tilbage til Dashboard</button>
            </AppHeader>
            <main className="bg-white p-4 rounded-lg shadow-sm">
                 <div className="flex justify-end mb-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-semibold"><UploadIcon/> Importér fra CSV</button>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-200"><th className="p-2 text-left text-sm font-semibold text-slate-600">Navn</th><th className="p-2 text-left text-sm font-semibold text-slate-600">Lokation</th><th className="p-2 text-left text-sm font-semibold text-slate-600">Email</th><th className="p-2 text-left text-sm font-semibold text-slate-600 w-24">Handlinger</th></tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-2"><EditableField initialValue={emp.name} onSave={name => updateEmployee(emp.id, { name })} /></td>
                                    <td className="p-2"><select value={emp.location} onChange={e => updateEmployee(emp.id, { location: e.target.value as Location })} className="bg-white border border-slate-300 rounded-md p-1.5 text-sm w-full">{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></td>
                                    <td className="p-2"><EditableField initialValue={emp.email} onSave={email => updateEmployee(emp.id, { email })} /></td>
                                    <td className="p-2"><button onClick={() => { if (window.confirm(`Er du sikker på du vil slette ${emp.name}?`)) deleteEmployee(emp.id); }} className="text-slate-400 hover:text-red-500 p-1"><TrashIcon /></button></td>
                                </tr>
                            ))}
                             <tr className="bg-slate-100">
                                <td className="p-2"><input type="text" placeholder="Nyt navn" value={newEmployee.name} onChange={e => setNewEmployee(s => ({...s, name: e.target.value}))} className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full"/></td>
                                <td className="p-2"><select value={newEmployee.location} onChange={e => setNewEmployee(s => ({...s, location: e.target.value as Location}))} className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full">{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></td>
                                <td className="p-2"><input type="email" placeholder="Email" value={newEmployee.email} onChange={e => setNewEmployee(s => ({...s, email: e.target.value}))} className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full"/></td>
                                <td className="p-2"><button onClick={handleSaveNewEmployee} className="w-full bg-blue-500 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-600">Tilføj</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

const ResourcesPlaceholder: React.FC<{ projectManager: ReturnType<typeof useProjectManager>, navigateTo: (name: string, projectId?: string) => void }> = ({ projectManager, navigateTo }) => {
    const { logout, currentUser, isSaving, apiError } = projectManager;

    return (
        <div>
            <AppHeader title="Ressource Analytics (preview)" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
                <button onClick={() => navigateTo('home')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">
                    Tilbage til Dashboard
                </button>
            </AppHeader>
            <main className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                <p className="text-slate-600">
                    Ressource analytics-modulet er aktiveret, men selve funktionaliteten er endnu under udvikling.
                    Denne side fungerer som et preview, mens backend-aggregationen og visualiseringerne færdiggøres.
                </p>
                <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1">
                    <li>API-endpointet <code>/api/analytics/resources</code> returnerer midlertidigt status 501 (Not Implemented).</li>
                    <li>Følgende opgaver dækker den videre implementering: RM-002 (aggregation), RM-003 (API) og RM-005 (frontend UI).</li>
                </ul>
                <p className="text-sm text-slate-500 border border-dashed border-slate-200 p-3 rounded-md bg-slate-50">
                    Fjern feature-flagget <code>RESOURCES_ANALYTICS_ENABLED</code> eller sæt det til <code>false</code>, hvis modulet ikke skal eksponeres endnu.
                </p>
            </main>
        </div>
    );
};

const UserManagementPage: React.FC<{ projectManager: ReturnType<typeof useProjectManager>, navigateTo: (name: string) => void }> = ({ projectManager, navigateTo }) => {
    const { allUsers, fetchAllUsers, updateUserRole, currentUser, logout, isSaving, apiError } = projectManager;
    const roles: UserRole[] = ['Administrator', 'Projektleder', 'Teammedlem'];

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    return (
        <div>
             <AppHeader title="Brugeradministration" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
                <button onClick={() => navigateTo('home')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">Tilbage til Dashboard</button>
            </AppHeader>
            <main className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-slate-600 mb-4">Her kan du administrere roller for alle brugere i systemet.</p>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-200">
                                <th className="p-2 text-left text-sm font-semibold text-slate-600">Navn</th>
                                <th className="p-2 text-left text-sm font-semibold text-slate-600">Email</th>
                                <th className="p-2 text-left text-sm font-semibold text-slate-600 w-48">Rolle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map(user => (
                                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-2 font-medium">{user.name}</td>
                                    <td className="p-2 text-slate-600">{user.email}</td>
                                    <td className="p-2">
                                        <select 
                                            value={user.role} 
                                            onChange={e => updateUserRole(user.id, e.target.value as UserRole)}
                                            className="bg-white border border-slate-300 rounded-md p-1.5 text-sm w-full"
                                            disabled={currentUser?.id === user.id}
                                            title={currentUser?.id === user.id ? "Administratorer kan ikke nedgradere sig selv" : "Skift rolle"}
                                        >
                                            {roles.map(role => <option key={role} value={role}>{role}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
};

const PmoPage: React.FC<{ projectManager: ReturnType<typeof useProjectManager>, navigateTo: (name: string, projectId?: string) => void }> = ({ projectManager, navigateTo }) => {
    const { employees, projects, logout, currentUser, isSaving, apiError } = projectManager;
    const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState(() => {
        const end = new Date();
        const start = new Date(end.getFullYear(), 0, 1);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    });

    const pmoDataByLocation = useMemo(() => {
        const activeProjects = projects.filter(p => p.status === 'active');
        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);

        const employeeData: EmployeeWorkload[] = employees.map(emp => {
            let totalPlanned = 0;
            let totalActual = 0;
            const projectDetails: EmployeeProjectSummary[] = [];

            activeProjects.forEach(project => {
                const member = project.projectMembers.find(m => m.employeeId === emp.id);
                if (!member) return;

                let projectPlanned = 0;
                let projectActual = 0;
                
                member.timeEntries.forEach(entry => {
                    const [yearPart, weekPart] = entry.weekKey.replace('W', '').split('-');
                    const year = Number(yearPart);
                    const week = Number(weekPart);
                    if (!Number.isFinite(year) || !Number.isFinite(week)) {
                        return;
                    }
                    const baseDate = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
                    const day = baseDate.getUTCDay();
                    const diff = baseDate.getUTCDate() - day + (day === 0 ? -6 : 1);
                    const weekDate = new Date(baseDate.setUTCDate(diff));

                    if (weekDate >= rangeStart && weekDate <= rangeEnd) {
                        projectPlanned += entry.plannedHours;
                        projectActual += entry.actualHours;
                    }
                });

                if (projectPlanned > 0 || projectActual > 0) {
                    totalPlanned += projectPlanned;
                    totalActual += projectActual;
                    projectDetails.push({ id: project.id, name: project.config.projectName, planned: projectPlanned, actual: projectActual });
                }
            });

            return { ...emp, totalPlanned, totalActual, projectDetails, projectCount: projectDetails.length };
        }).filter(summary => summary.totalPlanned > 0 || summary.totalActual > 0);

        const grouped = Object.fromEntries(
            locations.map(loc => [loc, [] as EmployeeWorkload[]])
        ) as Record<Location, EmployeeWorkload[]>;

        for (const summary of employeeData) {
            if (!summary.location) {
                continue;
            }
            grouped[summary.location].push(summary);
        }

        const locationTotals = Object.fromEntries(
            locations.map(loc => {
                const summaries = grouped[loc];
                const totals = summaries.reduce(
                    (accTotals, summary) => ({
                        planned: accTotals.planned + summary.totalPlanned,
                        actual: accTotals.actual + summary.totalActual,
                    }),
                    { planned: 0, actual: 0 },
                );
                return [loc, totals] as const;
            })
        ) as Record<Location, { planned: number; actual: number }>;
        
        return { grouped, totals: locationTotals };

    }, [employees, projects, dateRange]);

    const WorkloadBar: React.FC<{ planned: number, actual: number }> = ({ planned, actual }) => {
        if (planned === 0) return <span className="text-slate-500">N/A</span>;
        const percentage = Math.round((actual / planned) * 100);
        let color = 'bg-green-500';
        if (percentage > 100) color = 'bg-red-500';
        else if (percentage > 85) color = 'bg-yellow-500';
    return (
            <div className="w-full bg-slate-200 rounded-full h-4" title={`Belastning: ${percentage}%`}>
                <div className={color + " h-4 rounded-full"} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
            </div>
        );
    };

    return (
        <div>
            <AppHeader title="PMO Ressourceoverblik" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}><button onClick={() => navigateTo('home')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">Tilbage til Dashboard</button></AppHeader>
            <main className="space-y-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold">Filter (kun aktive projekter)</h2>
                        <div><input type="date" value={dateRange.start} onChange={e => setDateRange(d => ({...d, start: e.target.value}))} className="bg-white border border-slate-300 rounded-md p-2 text-sm" /></div>
                        <div><input type="date" value={dateRange.end} onChange={e => setDateRange(d => ({...d, end: e.target.value}))} className="bg-white border border-slate-300 rounded-md p-2 text-sm" /></div>
                    </div>
                </div>
                {locations.map(location => {
                    const employeesInLocation = pmoDataByLocation.grouped[location];
                    const locationTotals = pmoDataByLocation.totals[location];
                    if (!employeesInLocation || employeesInLocation.length === 0) return null;

                    return (
                        <div key={location} className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="flex justify-between items-baseline mb-3">
                                <h3 className="text-xl font-bold text-slate-700">{location}</h3>
                                {locationTotals && <p className="text-sm text-slate-600 font-semibold">Total Planlagt: {locationTotals.planned.toFixed(1)}t, Total Faktisk: {locationTotals.actual.toFixed(1)}t</p>}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead><tr className="border-b-2 border-slate-200"><th className="p-2 w-8"></th><th className="p-2 text-left">Navn</th><th className="p-2 text-right">Planlagte timer</th><th className="p-2 text-right">Faktiske timer</th><th className="p-2 text-left w-48">Belastning</th></tr></thead>
                                    <tbody>
                                        {employeesInLocation.map(emp => (
                                            <React.Fragment key={emp.id}>
                                                <tr className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td>{emp.projectCount > 0 && <button onClick={() => setExpandedEmployeeId(p => p === emp.id ? null : emp.id)} className="p-1 text-slate-500 hover:bg-slate-200 rounded-full"><ChevronDownIcon /></button>}</td>
                                                    <td className="p-2 font-medium">{emp.name} {emp.projectCount > 0 && <span className="text-xs text-slate-500">({emp.projectCount})</span>}</td>
                                                    <td className="p-2 text-right font-semibold">{emp.totalPlanned.toFixed(1)}</td>
                                                    <td className="p-2 text-right font-semibold">{emp.totalActual.toFixed(1)}</td>
                                                    <td className="p-2"><WorkloadBar planned={emp.totalPlanned} actual={emp.totalActual} /></td>
                                                </tr>
                                                {expandedEmployeeId === emp.id && (
                                                    <tr>
                                                        <td colSpan={5} className="p-0">
                                                            <div className="bg-slate-100 p-3">
                                                                <table className="w-full bg-white rounded">
                                                                    <thead><tr className="border-b-2 border-slate-200"><th className="p-2 text-left">Projekt</th><th className="p-2 text-right">Planlagte timer</th><th className="p-2 text-right">Faktiske timer</th></tr></thead>
                                                                    <tbody>
                                                                        {emp.projectDetails.map(p => (
                                                                            <tr key={p.id} className="border-b border-slate-100"><td className="p-2 text-sm cursor-pointer hover:underline" onClick={() => navigateTo('project', p.id)}>{p.name}</td><td className="p-2 text-sm text-right">{p.planned.toFixed(1)}</td><td className="p-2 text-sm text-right">{p.actual.toFixed(1)}</td></tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </main>
        </div>
    );
};

const ProjectPage: React.FC<{ projectId: string; projectManager: ReturnType<typeof useProjectManager>; navigateTo: (name: string, projectId?: string) => void; }> = ({ projectId, projectManager, navigateTo }) => {
    const { getProjectById, logout, currentUser, isSaving, apiError, canManage } = projectManager;
    const project = getProjectById(projectId);
    const [activeSubPage, setActiveSubPage] = useState('reports');

    const handleExportPdf = () => window.print();

    if (!project) return <div><h2>Projekt ikke fundet</h2><button onClick={() => navigateTo('home')}>Tilbage</button></div>;
    
    const subPages = [
        { key: 'reports', label: 'Rapporter' }, 
        { key: 'organization', label: 'Projektorganisation' }, 
        ...(canManage ? [{ key: 'settings', label: 'Indstillinger' }] : [])
    ];
    
    return (
        <div className="flex flex-col gap-6">
            <AppHeader title={project.config.projectName} user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
                <button onClick={() => navigateTo('home')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">Tilbage til Dashboard</button>
            </AppHeader>

            <div className="bg-white p-2 rounded-lg shadow-sm flex flex-wrap justify-between items-center gap-4 export-hide">
                 <div className="flex items-center gap-2">
                    {subPages.map(p => <button key={p.key} onClick={() => setActiveSubPage(p.key)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeSubPage === p.key ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'}`}>{p.label}</button>)}
                 </div>
                 {activeSubPage === 'reports' && (
                    <button onClick={handleExportPdf} className="flex items-center justify-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                        <DownloadIcon /><span>Eksportér PDF</span>
                    </button>
                 )}
            </div>

            {activeSubPage === 'reports' && <ReportPage project={project} projectManager={projectManager} />}
            {activeSubPage === 'organization' && <ProjectOrganizationPage project={project} projectManager={projectManager} />}
            {activeSubPage === 'settings' && canManage && <ProjectSettingsPage project={project} projectManager={projectManager} />}
        </div>
    );
};

const ReportPage: React.FC<{ project: Project; projectManager: ReturnType<typeof useProjectManager>; }> = ({ project, projectManager }) => {
    const [activeWeekKey, setActiveWeekKey] = useState<string | null>(project.reports[0]?.weekKey || null);
    const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
    
    const actions = projectManager.projectActions(project.id, activeWeekKey);
    const activeReport = useMemo(() => project.reports.find(r => r.weekKey === activeWeekKey) || null, [project, activeWeekKey]);
    const { canManage } = projectManager;

    useEffect(() => { 
        if ((!activeWeekKey || !project.reports.some(r => r.weekKey === activeWeekKey)) && project.reports.length > 0) {
            setActiveWeekKey(project.reports.sort((a,b) => b.weekKey.localeCompare(a.weekKey))[0].weekKey)
        } else if (project.reports.length === 0) {
            setActiveWeekKey(null);
        }
    }, [project.reports, activeWeekKey]);
    
    if (!actions) return null;

    const { reportsManager, ...restActions } = actions;
    
    const handleCreateNext = () => {
        const newKey = reportsManager.createNext();
        if (newKey) setActiveWeekKey(newKey);
    };

    const handleDeleteReport = (weekKey: string) => {
        reportsManager.delete(weekKey);
        // After deletion, select the latest available report or null if none
        const remainingReports = project.reports.filter(r => r.weekKey !== weekKey);
        if (remainingReports.length > 0) {
             setActiveWeekKey(remainingReports.sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0].weekKey);
        } else {
            setActiveWeekKey(null);
        }
    };
    
    if (project.reports.length === 0) {
        return <div className="text-center bg-white p-10 rounded-lg shadow-sm"><h2>Ingen rapporter</h2>{canManage && <button onClick={handleCreateNext} className="mt-4 bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600">Opret første rapport</button>}</div>;
    }
    
    if (!activeReport) {
        return <div className="text-center bg-white p-10 rounded-lg shadow-sm"><h2>Vælg en rapport fra listen for at se den.</h2></div>;
    }
    
    const { timelineManager, statusListManager, challengeListManager, kanbanManager, riskManager } = restActions;
    
    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
            <aside className="w-full lg:w-64 flex-shrink-0 bg-white p-4 rounded-lg shadow-sm flex flex-col export-hide self-stretch">
                <h3 className="text-lg font-bold mb-3 text-slate-700">Rapporter</h3>
                {canManage && (
                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => setIsNewReportModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 p-2 rounded-md transition-colors" title="Opret ny specifik ugerapport"><PlusIcon /> Ny</button>
                        <button onClick={handleCreateNext} className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-green-600 bg-green-100 hover:bg-green-200 p-2 rounded-md transition-colors" title="Opret rapport for næste uge"><StepForwardIcon /> Næste</button>
                    </div>
                )}
                <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                    <ul className="space-y-1">
                        {project.reports.map(r => (
                            <li key={r.weekKey} className="group relative">
                                <button onClick={() => setActiveWeekKey(r.weekKey)} className={`w-full text-left p-2 rounded-md text-sm font-medium flex items-center gap-3 ${r.weekKey === activeWeekKey ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'}`}><CalendarIcon />{r.weekKey}</button>
                                {canManage && <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Slet rapport for ${r.weekKey}?`)) handleDeleteReport(r.weekKey); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Slet rapport"><TrashIcon /></button>}
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
            <main id="report-content" className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 w-full">
                <div className="lg:col-span-2"><KanbanBoard tasks={activeReport.state.kanbanTasks || []} onAddTask={kanbanManager.add} onUpdateTask={kanbanManager.updateContent} onDeleteTask={kanbanManager.delete} onMoveTask={kanbanManager.updateStatus} /></div>
                <div className="lg:col-span-2"><Timeline projectStartDate={project.config.projectStartDate} projectEndDate={project.config.projectEndDate} phases={activeReport.state.phases} milestones={activeReport.state.milestones} deliverables={activeReport.state.deliverables} calculateDateFromPosition={timelineManager.calculateDateFromPosition} calculatePositionFromDate={timelineManager.calculatePositionFromDate} monthMarkers={timelineManager.getMonthMarkers()} todayPosition={timelineManager.getTodayPosition()} addTimelineItem={timelineManager.add} updateTimelineItem={timelineManager.update} deleteTimelineItem={timelineManager.delete} /></div>
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6"><EditableList title="Status" items={activeReport.state.statusItems} onAddItem={statusListManager.addItem} onDeleteItem={statusListManager.deleteItem} onUpdateItem={statusListManager.updateItem} onReorderItems={statusListManager.reorderItems} /><EditableList title="Udfordringer" items={activeReport.state.challengeItems} onAddItem={challengeListManager.addItem} onDeleteItem={challengeListManager.deleteItem} onUpdateItem={challengeListManager.updateItem} onReorderItems={challengeListManager.reorderItems} /></div>
                <div className="lg:col-span-2"><MainStatusTable rows={activeReport.state.mainTableRows} cycleStatus={restActions.cycleStatus} updateNote={restActions.updateMainTableRowNote} /></div>
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6"><div className="md:col-span-1"><DeliverablesList deliverables={activeReport.state.deliverables} calculateDateFromPosition={timelineManager.calculateDateFromPosition} /></div><div className="md:col-span-2"><RiskMatrix risks={activeReport.state.risks} updateRiskPosition={riskManager.updatePosition} addRisk={riskManager.add} updateRiskName={riskManager.updateName} deleteRisk={riskManager.delete} /></div></div>
            </main>
            {isNewReportModalOpen && <NewReportModal manager={reportsManager} onClose={() => setIsNewReportModalOpen(false)} onSelect={(key) => {reportsManager.create(key, true); setActiveWeekKey(key); setIsNewReportModalOpen(false)}} />}
        </div>
    );
};

const NewReportModal: React.FC<{ manager: ReportsManager; onClose: () => void; onSelect: (weekKey: string) => void }> = ({ manager, onClose, onSelect }) => {
    const availableWeeks = manager.getAvailableWeeks();
    const [selectedWeek, setSelectedWeek] = useState<string>(availableWeeks[0] || '');

    useEffect(() => {
        if (!selectedWeek || !availableWeeks.includes(selectedWeek)) {
            setSelectedWeek(availableWeeks[0] ?? '');
        }
    }, [availableWeeks, selectedWeek]);

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 export-hide">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-slate-800">Opret ny ugerapport</h3>
                <label htmlFor="week-select" className="block text-sm font-medium text-slate-700 mb-2">Vælg uge for rapporten (baseres på seneste)</label>
                {availableWeeks.length > 0 ? (
                    <select id="week-select" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md p-2 text-sm">{availableWeeks.map((w: string) => <option key={w} value={w}>{w}</option>)}</select>
                ) : (
                    <p className="text-sm text-slate-500 p-3 bg-slate-100 rounded-md">Der er ingen flere ledige uger i projektperioden.</p>
                )}
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="bg-slate-200 text-slate-800 px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-300">Annuller</button>
                    <button onClick={() => onSelect(selectedWeek)} disabled={!selectedWeek} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-700 disabled:bg-slate-300">Opret</button>
                </div>
            </div>
        </div>
    );
};

const ProjectOrganizationPage: React.FC<{ project: Project; projectManager: ReturnType<typeof useProjectManager>; }> = ({ project, projectManager }) => {
    const actions = projectManager.projectActions(project.id, null);
    if (!actions) return null;
    return (
    <ProjectOrganizationChart
      project={project}
      members={project.projectMembers}
      allEmployees={projectManager.employees}
      canManageMembers={projectManager.canManage}
      canLogTime={project.permissions?.canLogTime ?? false}
      currentUserEmployeeId={projectManager.currentUser?.employeeId ?? null}
      onAssignEmployee={actions.organizationManager.assignEmployee}
      onUpdateMember={actions.organizationManager.updateMember}
      onDeleteMember={actions.organizationManager.deleteMember}
      onUpdateTimeLog={actions.organizationManager.updateTimeLog}
      onBulkUpdateTimeLog={actions.organizationManager.bulkUpdateTimeLog}
    />
  );
};

const ProjectSettingsPage: React.FC<{ project: Project; projectManager: ReturnType<typeof useProjectManager>; }> = ({ project, projectManager }) => {
    const { updateProjectConfig, updateProjectStatus } = projectManager;
    const projectStatusOptions: { key: ProjectStatus, label: string }[] = [{key: 'active', label: 'Aktiv'}, {key: 'completed', label: 'Fuldført'}, {key: 'on-hold', label: 'På hold'}];
    return (
         <div className="bg-white p-4 rounded-lg shadow-sm">
             <h3 className="text-lg font-bold mb-4 text-slate-700">Projektindstillinger</h3>
             <div className="max-w-md space-y-4">
                 <div><label className="block text-sm font-medium text-slate-600 mb-1">Projektnavn</label><EditableField initialValue={project.config.projectName} onSave={(newName) => updateProjectConfig(project.id, { projectName: newName })} className="text-lg"/></div>
                 <div className="flex items-center gap-4">
                    <div className="flex-1"><label className="block text-sm font-medium text-slate-600 mb-1">Startdato</label><input type="date" value={project.config.projectStartDate} onChange={e => updateProjectConfig(project.id, { projectStartDate: e.target.value })} className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full" style={{ colorScheme: 'light' }}/></div>
                    <div className="flex-1"><label className="block text-sm font-medium text-slate-600 mb-1">Slutdato</label><input type="date" value={project.config.projectEndDate} onChange={e => updateProjectConfig(project.id, { projectEndDate: e.target.value })} className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full" style={{ colorScheme: 'light' }}/></div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Projektstatus</label>
                    <select value={project.status} onChange={e => updateProjectStatus(project.id, e.target.value as ProjectStatus)} className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full">
                        {projectStatusOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                    </select>
                 </div>
             </div>
         </div>
    );
};

const App: React.FC = () => (
  <ProjectManagerProvider>
    <AppContent />
  </ProjectManagerProvider>
);

export default App;













