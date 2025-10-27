import { useCallback, useEffect } from 'react';
import { api } from '../../api';
import type { ProjectManagerStore } from './store';
import { getErrorMessage } from './utils';

export const useAuthModule = (store: ProjectManagerStore) => {
  const {
    setProjects,
    setEmployees,
    setAllUsers,
    setIsLoading,
    setIsAuthenticated,
    setCurrentUser,
    setApiError,
    setNeedsSetup,
    setIsSaving,
  } = store;

  useEffect(() => {
    let isMounted = true;

    const checkAuthAndLoad = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        const setupStatus = await api.checkSetupStatus();
        if (!isMounted) return;
        if (setupStatus.needsSetup) {
          setNeedsSetup(true);
          setIsLoading(false);
          return;
        }

        const user = await api.getAuthenticatedUser();
        if (!isMounted || !user) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          return;
        }

        const workspace = await api.getWorkspace();
        if (!isMounted) return;
        setProjects(workspace.projects);
        setEmployees(workspace.employees);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (error: unknown) {
        if (isMounted) {
          console.error('Failed to load session:', error);
          setApiError('Kunne ikke hente data. Prøv at genindlæse siden.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuthAndLoad();

    return () => {
      isMounted = false;
    };
  }, [
    setApiError,
    setCurrentUser,
    setEmployees,
    setIsAuthenticated,
    setIsLoading,
    setNeedsSetup,
    setProjects,
  ]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setApiError(null);
      try {
        const result = await api.login(email, password);
        if (result.success && result.user) {
          const workspace = await api.getWorkspace();
          setProjects(workspace.projects);
          setEmployees(workspace.employees);
          setCurrentUser(result.user);
          setIsAuthenticated(true);
        }
        return result;
      } catch (error: unknown) {
        console.error('Login failed:', error);
        setApiError('Der opstod en fejl under login.');
        return { success: false, message: getErrorMessage(error) };
      } finally {
        setIsLoading(false);
      }
    },
    [setApiError, setCurrentUser, setEmployees, setIsAuthenticated, setIsLoading, setProjects],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error: unknown) {
      console.error('Logout failed:', error);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setProjects([]);
      setEmployees([]);
      setAllUsers([]);
      setIsSaving(false);
    }
  }, [setAllUsers, setCurrentUser, setEmployees, setIsAuthenticated, setIsSaving, setProjects]);

  const register = useCallback(
    async (email: string, name: string, password: string) => api.register(email, name, password),
    [],
  );

  const completeSetup = useCallback(() => setNeedsSetup(false), [setNeedsSetup]);

  return {
    isAuthenticated: store.isAuthenticated,
    currentUser: store.currentUser,
    isLoading: store.isLoading,
    isSaving: store.isSaving,
    apiError: store.apiError,
    needsSetup: store.needsSetup,
    login,
    logout,
    register,
    completeSetup,
  };
};
