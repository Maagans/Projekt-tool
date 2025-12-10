import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useProjectManagerInternal } from './useProjectManagerInternal';

type ProjectManagerValue = ReturnType<typeof useProjectManagerInternal>;

type AuthContextValue = Pick<ProjectManagerValue,
  | 'isAuthenticated'
  | 'currentUser'
  | 'isLoading'
  | 'isSaving'
  | 'isBootstrapping'
  | 'apiError'
  | 'login'
  | 'logout'
  | 'register'
  | 'needsSetup'
  | 'completeSetup'
  | 'isAdministrator'
  | 'canManage'
  | 'shouldRedirectToLogin'
  | 'acknowledgeLogoutRedirect'
>;

type WorkspaceContextValue = Pick<ProjectManagerValue,
  | 'projects'
  | 'employees'
  | 'workspaceSettings'
  | 'isWorkspaceFetching'
  | 'updatePmoBaselineHoursWeek'
  | 'createNewProject'
  | 'deleteProject'
  | 'updateProjectConfig'
  | 'updateProjectStatus'
  | 'getProjectById'
  | 'getWeekKey'
  | 'projectActions'
  | 'addEmployee'
  | 'updateEmployee'
  | 'deleteEmployee'
  | 'importEmployeesFromCsv'
  | 'currentWorkspace'
>;

type AdminContextValue = Pick<ProjectManagerValue,
  | 'allUsers'
  | 'workspaces'
  | 'fetchAllUsers'
  | 'fetchWorkspaces'
  | 'updateUserRole'
  | 'updateUserWorkspace'
>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);
const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export const ProjectManagerProvider = ({ children }: { children: ReactNode }) => {
  const value = useProjectManagerInternal();

  const authValue = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: value.isAuthenticated,
      currentUser: value.currentUser,
      isLoading: value.isLoading,
      isSaving: value.isSaving,
      isBootstrapping: value.isBootstrapping,
      apiError: value.apiError,
      login: value.login,
      logout: value.logout,
      register: value.register,
      needsSetup: value.needsSetup,
      completeSetup: value.completeSetup,
      isAdministrator: value.isAdministrator,
      canManage: value.canManage,
      shouldRedirectToLogin: value.shouldRedirectToLogin,
      acknowledgeLogoutRedirect: value.acknowledgeLogoutRedirect,
    }),
    [
      value.isAuthenticated,
      value.currentUser,
      value.isLoading,
      value.isSaving,
      value.isBootstrapping,
      value.apiError,
      value.login,
      value.logout,
      value.register,
      value.needsSetup,
      value.completeSetup,
      value.isAdministrator,
      value.canManage,
      value.shouldRedirectToLogin,
      value.acknowledgeLogoutRedirect,
    ],
  );

  const workspaceValue = useMemo<WorkspaceContextValue>(
    () => ({
      projects: value.projects,
      employees: value.employees,
      workspaceSettings: value.workspaceSettings,
      isWorkspaceFetching: value.isWorkspaceFetching,
      updatePmoBaselineHoursWeek: value.updatePmoBaselineHoursWeek,
      createNewProject: value.createNewProject,
      deleteProject: value.deleteProject,
      updateProjectConfig: value.updateProjectConfig,
      updateProjectStatus: value.updateProjectStatus,
      getProjectById: value.getProjectById,
      getWeekKey: value.getWeekKey,
      projectActions: value.projectActions,
      addEmployee: value.addEmployee,
      updateEmployee: value.updateEmployee,
      deleteEmployee: value.deleteEmployee,
      importEmployeesFromCsv: value.importEmployeesFromCsv,
      currentWorkspace: value.currentWorkspace,
    }),
    [
      value.projects,
      value.employees,
      value.workspaceSettings,
      value.isWorkspaceFetching,
      value.updatePmoBaselineHoursWeek,
      value.createNewProject,
      value.deleteProject,
      value.updateProjectConfig,
      value.updateProjectStatus,
      value.getProjectById,
      value.getWeekKey,
      value.projectActions,
      value.addEmployee,
      value.updateEmployee,
      value.deleteEmployee,
      value.importEmployeesFromCsv,
      value.currentWorkspace,
    ],
  );

  const adminValue = useMemo<AdminContextValue>(
    () => ({
      allUsers: value.allUsers,
      workspaces: value.workspaces,
      fetchAllUsers: value.fetchAllUsers,
      fetchWorkspaces: value.fetchWorkspaces,
      updateUserRole: value.updateUserRole,
      updateUserWorkspace: value.updateUserWorkspace,
    }),
    [value.allUsers, value.workspaces, value.fetchAllUsers, value.fetchWorkspaces, value.updateUserRole, value.updateUserWorkspace],
  );

  return (
    <AuthContext.Provider value={authValue}>
      <WorkspaceContext.Provider value={workspaceValue}>
        <AdminContext.Provider value={adminValue}>{children}</AdminContext.Provider>
      </WorkspaceContext.Provider>
    </AuthContext.Provider>
  );
};

export const useAuthManager = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthManager must be used within a ProjectManagerProvider');
  }
  return context;
};

export const useWorkspaceManager = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceManager must be used within a ProjectManagerProvider');
  }
  return context;
};

export const useAdminManager = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminManager must be used within a ProjectManagerProvider');
  }
  return context;
};

export const useProjectManager = () => {
  const auth = useAuthManager();
  const workspace = useWorkspaceManager();
  const admin = useAdminManager();
  return useMemo(() => ({
    ...auth,
    ...workspace,
    ...admin,
  }), [auth, workspace, admin]);
};
