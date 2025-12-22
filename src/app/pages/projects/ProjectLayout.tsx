import { createContext, useContext, useMemo } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
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
  const projectManager = useProjectManager();
  const { getProjectById, logout, currentUser, isSaving, isWorkspaceFetching, apiError } = projectManager;

  const project = useMemo(
    () => (projectId ? getProjectById(projectId) : null),
    [getProjectById, projectId],
  );



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
      <div className="flex flex-col gap-6 flex-1">
        <AppHeader
          title={project.config?.projectName || 'Projekt'}
          user={currentUser}
          isSaving={isSaving}
          isRefreshing={isWorkspaceFetching}
          apiError={apiError}
          onLogout={logout}
        />

        <Outlet />
      </div>
    </ProjectRouteContext.Provider>
  );
};
export default ProjectLayout;
