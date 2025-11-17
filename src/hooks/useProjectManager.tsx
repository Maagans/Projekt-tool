import { createContext, useContext, ReactNode } from 'react';
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
>;

type AdminContextValue = Pick<ProjectManagerValue,
  | 'allUsers'
  | 'fetchAllUsers'
  | 'updateUserRole'
>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);
const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export const ProjectManagerProvider = ({ children }: { children: ReactNode }) => {
  const value = useProjectManagerInternal();

  const authValue: AuthContextValue = {
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
  };

  const workspaceValue: WorkspaceContextValue = {
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
  };

  const adminValue: AdminContextValue = {
    allUsers: value.allUsers,
    fetchAllUsers: value.fetchAllUsers,
    updateUserRole: value.updateUserRole,
  };

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
  return {
    ...auth,
    ...workspace,
    ...admin,
  };
};
