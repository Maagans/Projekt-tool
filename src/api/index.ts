// src/api/index.ts
// Central API module - re-exports all domain APIs and creates backward-compat api object

// Export core utilities from client
export { fetchWithAuth, AUTH_USER_STORAGE_KEY, toErrorMessage, resolveUrl } from './client';
export type { HttpError } from './client';

// Export domain-specific APIs
export { authApi } from './authApi';
export { employeesApi } from './employeesApi';
export { projectsApi } from './projectsApi';
export { riskApi } from './riskApi';
export { analyticsApi } from './analyticsApi';
export { adminApi } from './adminApi';
export { workspaceApi } from './workspaceApi';
export { reportApi } from './reportApi';
export { planApi } from './planApi';
export { organizationsApi } from './organizationsApi';
export { workspacesApi } from './workspacesApi';

// Import for combining into backward-compat api object
import { authApi } from './authApi';
import { employeesApi } from './employeesApi';
import { projectsApi } from './projectsApi';
import { riskApi } from './riskApi';
import { analyticsApi } from './analyticsApi';
import { adminApi } from './adminApi';
import { workspaceApi } from './workspaceApi';

// Backward compatibility: combined api object
// Allows existing code to use: import { api } from './api'; api.login(...);
export const api = {
    // Auth
    ...authApi,
    // Employees
    createEmployee: employeesApi.createEmployee,
    updateEmployee: employeesApi.updateEmployee,
    deleteEmployee: employeesApi.deleteEmployee,
    // Projects
    createProject: projectsApi.createProject,
    updateProject: projectsApi.updateProject,
    deleteProject: projectsApi.deleteProject,
    addProjectMember: projectsApi.addProjectMember,
    updateProjectMember: projectsApi.updateProjectMember,
    deleteProjectMember: projectsApi.deleteProjectMember,
    logTimeEntry: projectsApi.logTimeEntry,
    // Workspace
    getWorkspace: workspaceApi.getWorkspace,
    updateWorkspaceSettings: workspaceApi.updateWorkspaceSettings,
    // Risks
    getProjectRisks: riskApi.getProjectRisks,
    createProjectRisk: riskApi.createProjectRisk,
    updateProjectRisk: riskApi.updateProjectRisk,
    archiveProjectRisk: riskApi.archiveProjectRisk,
    attachReportRisks: riskApi.attachReportRisks,
    updateReportRiskSnapshot: riskApi.updateReportRiskSnapshot,
    // Analytics
    fetchResourceAnalytics: analyticsApi.fetchResourceAnalytics,
    // Admin
    getUsers: adminApi.getUsers,
    updateUserRole: adminApi.updateUserRole,
};

