import { useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, AUTH_USER_STORAGE_KEY } from '../../api';
import type { ProjectManagerStore } from './store';
import { getErrorMessage } from './utils';
import { registerUnauthorizedLogoutHandler, unregisterUnauthorizedLogoutHandler } from './authEvents';

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
    setWorkspaceSettings,
    setLogoutRedirect,
    setIsBootstrapping,
  } = store;

  const queryClient = useQueryClient();

  const clearSessionState = useCallback(
    (message?: string | null) => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setProjects([]);
      setEmployees([]);
      setAllUsers([]);
      setIsSaving(false);
      setIsLoading(false);
      setNeedsSetup(false);
      setWorkspaceSettings({ pmoBaselineHoursWeek: 0 });
      setIsBootstrapping(false);
      if (typeof message !== 'undefined') {
        setApiError(message);
      }
      queryClient.removeQueries({ queryKey: ['workspace'] });
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    },
    [
      queryClient,
      setAllUsers,
      setApiError,
      setCurrentUser,
      setEmployees,
      setIsAuthenticated,
      setIsLoading,
      setIsSaving,
      setNeedsSetup,
      setProjects,
      setWorkspaceSettings,
      setIsBootstrapping,
    ],
  );

  const triggerLogoutRedirect = useCallback(
    (message?: string | null) => {
      clearSessionState(message);
      setLogoutRedirect(true);
    },
    [clearSessionState, setLogoutRedirect],
  );

  const acknowledgeLogoutRedirect = useCallback(() => setLogoutRedirect(false), [setLogoutRedirect]);

  const handleUnauthorized = useCallback(() => {
    triggerLogoutRedirect('Din session er udløbet. Log ind igen.');
  }, [triggerLogoutRedirect]);

  useEffect(() => {
    registerUnauthorizedLogoutHandler(handleUnauthorized);
    return () => unregisterUnauthorizedLogoutHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      setIsLoading(true);
      setApiError(null);
      try {
        const setupStatus = await api.checkSetupStatus();
        if (!isMounted) return;
        if (setupStatus.needsSetup) {
          setNeedsSetup(true);
          setIsBootstrapping(false);
          return;
        }

        const user = await api.getAuthenticatedUser();
        if (!isMounted || !user) {
          clearSessionState();
          return;
        }

        setCurrentUser(user);
        setIsAuthenticated(true);
        acknowledgeLogoutRedirect();
        await queryClient.invalidateQueries({ queryKey: ['workspace'] });
      } catch (error: unknown) {
        if (isMounted) {
          console.error('Failed to load session:', error);
          setApiError('Kunne ikke hente data. Prøv at genindlæse siden.');
          setIsBootstrapping(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    acknowledgeLogoutRedirect,
    clearSessionState,
    queryClient,
    setApiError,
    setCurrentUser,
    setIsAuthenticated,
    setIsLoading,
    setNeedsSetup,
    setIsBootstrapping,
  ]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onMutate: () => {
      setIsLoading(true);
      setApiError(null);
    },
    onSuccess: async (result) => {
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        acknowledgeLogoutRedirect();
        setIsBootstrapping(true);
        await queryClient.invalidateQueries({ queryKey: ['workspace'] });
      } else {
        setApiError(result.message ?? 'Der opstod en fejl under login.');
        setIsBootstrapping(false);
      }
    },
    onError: (error: unknown) => {
      console.error('Login failed:', error);
      setApiError('Der opstod en fejl under login.');
      setIsBootstrapping(false);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onMutate: () => {
      setIsLoading(true);
    },
    onError: (error: unknown) => {
      console.error('Logout failed:', error);
    },
    onSettled: () => {
      triggerLogoutRedirect(null);
    },
  });

  const register = useCallback(
    async (email: string, name: string, password: string) => api.register(email, name, password),
    [],
  );

  const completeSetup = useCallback(() => setNeedsSetup(false), [setNeedsSetup]);

  const loginHandler = useCallback(
    async (email: string, password: string) => {
      try {
        return await loginMutation.mutateAsync({ email, password });
      } catch (error: unknown) {
        console.error('Login mutation failed:', error);
        setApiError('Der opstod en fejl under login.');
        return { success: false, message: getErrorMessage(error) };
      }
    },
    [loginMutation, setApiError],
  );

  const logoutHandler = useCallback(() => logoutMutation.mutateAsync(), [logoutMutation]);

  return {
    isAuthenticated: store.isAuthenticated,
    currentUser: store.currentUser,
    isLoading: store.isLoading,
    isSaving: store.isSaving,
    isBootstrapping: store.isBootstrapping,
    apiError: store.apiError,
    needsSetup: store.needsSetup,
    shouldRedirectToLogin: store.logoutRedirect,
    acknowledgeLogoutRedirect,
    login: loginHandler,
    logout: logoutHandler,
    register,
    completeSetup,
  };
};
