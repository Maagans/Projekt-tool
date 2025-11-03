import { useProjectManagerStore } from './projectManager/store';
import { useAuthModule } from './projectManager/useAuthModule';
import { useWorkspaceModule } from './projectManager/useWorkspaceModule';
import { useAdminModule } from './projectManager/useAdminModule';

export const useProjectManagerInternal = () => {
  const store = useProjectManagerStore();
  const auth = useAuthModule(store);
  const workspace = useWorkspaceModule(store);
  const admin = useAdminModule(store);

  const isAdministrator = auth.currentUser?.role === 'Administrator';
  const canManage = isAdministrator || auth.currentUser?.role === 'Projektleder';

  return {
    ...auth,
    isAdministrator,
    canManage,
    projects: workspace.projects,
    employees: workspace.employees,
    workspaceSettings: workspace.workspaceSettings,
    updatePmoBaselineHoursWeek: workspace.updatePmoBaselineHoursWeek,
    allUsers: admin.allUsers,
    fetchAllUsers: admin.fetchAllUsers,
    updateUserRole: admin.updateUserRole,
    addEmployee: workspace.addEmployee,
    updateEmployee: workspace.updateEmployee,
    deleteEmployee: workspace.deleteEmployee,
    importEmployeesFromCsv: workspace.importEmployeesFromCsv,
    createNewProject: workspace.createNewProject,
    deleteProject: workspace.deleteProject,
    updateProjectConfig: workspace.updateProjectConfig,
    updateProjectStatus: workspace.updateProjectStatus,
    getProjectById: workspace.getProjectById,
    getWeekKey: workspace.getWeekKey,
    projectActions: workspace.projectActions,
  };
};
