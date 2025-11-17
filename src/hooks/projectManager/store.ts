import { useState } from 'react';
import type { Employee, Project, User, WorkspaceSettings } from '../../types';

export interface ProjectManagerStore {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  workspaceSettings: WorkspaceSettings;
  setWorkspaceSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  apiError: string | null;
  setApiError: React.Dispatch<React.SetStateAction<string | null>>;
  needsSetup: boolean;
  setNeedsSetup: React.Dispatch<React.SetStateAction<boolean>>;
  logoutRedirect: boolean;
  setLogoutRedirect: React.Dispatch<React.SetStateAction<boolean>>;
  isBootstrapping: boolean;
  setIsBootstrapping: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useProjectManagerStore = (): ProjectManagerStore => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>({ pmoBaselineHoursWeek: 0 });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [logoutRedirect, setLogoutRedirect] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  return {
    projects,
    setProjects,
    employees,
    setEmployees,
    workspaceSettings,
    setWorkspaceSettings,
    allUsers,
    setAllUsers,
    isLoading,
    setIsLoading,
    isAuthenticated,
    setIsAuthenticated,
    currentUser,
    setCurrentUser,
    isSaving,
    setIsSaving,
    apiError,
    setApiError,
    needsSetup,
    setNeedsSetup,
    logoutRedirect,
    setLogoutRedirect,
    isBootstrapping,
    setIsBootstrapping,
  };
};
