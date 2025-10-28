import { createContext, useContext, useMemo } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { useProjectManager } from '../../../hooks/useProjectManager';
import type { Project } from '../../../types';

type ProjectRouteContextValue = {
  project: Project;
  projectManager: ReturnType<typeof useProjectManager>;
};

const ProjectRouteContext = createContext<ProjectRouteContextValue | undefined>(undefined);

export const useProjectRouteContext = () => {
  const context = useContext(ProjectRouteContext);
  if (!context) {
    throw new Error('useProjectRouteContext must be used within a ProjectRouteContext provider');
  }
  return context;
};

export const ProjectLayout = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const projectManager = useProjectManager();
  const { getProjectById, logout, currentUser, isSaving, apiError, canManage } = projectManager;

  const project = projectId ? getProjectById(projectId) : null;

  const tabs = useMemo(
    () =>
      [
        { key: 'reports', label: 'Rapporter', path: 'reports' },
        { key: 'organization', label: 'Projektorganisation', path: 'organization' },
        ...(canManage ? [{ key: 'settings', label: 'Indstillinger', path: 'settings' }] : []),
      ] as const,
    [canManage],
  );

  const isReportsRoute = location.pathname.endsWith('/reports') || location.pathname.endsWith(projectId ?? '');

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md rounded-xl bg-white p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-slate-800">Projektet blev ikke fundet</h2>
          <p className="mt-2 text-slate-600">
            Projektet med id <code>{projectId}</code> findes ikke længere. Gå tilbage til dashboardet og prøv igen.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Tilbage til Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProjectRouteContext.Provider value={{ project, projectManager }}>
      <div className="flex flex-col gap-6">
        <AppHeader title={project.config.projectName} user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
          <button onClick={() => navigate('/')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">
            Tilbage til Dashboard
          </button>
        </AppHeader>

        <div className="bg-white p-2 rounded-lg shadow-sm flex flex-wrap justify-between items-center gap-4 export-hide">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.key}
                to={tab.path}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'}`
                }
                end
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
          {isReportsRoute && (
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Eksportér PDF
            </button>
          )}
        </div>

        <Outlet />
      </div>
    </ProjectRouteContext.Provider>
  );
};

export const ProjectIndexRedirect = () => <Navigate replace to="reports" />;

export default ProjectLayout;
