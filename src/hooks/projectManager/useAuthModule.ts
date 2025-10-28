import { useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        const setupStatus = await api.checkSetupStatus();
        if (!isMounted) return;
        if (setupStatus.needsSetup) {
          setNeedsSetup(true);
          return;
        }

        const user = await api.getAuthenticatedUser();
        if (!isMounted || !user) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          return;
        }

        setCurrentUser(user);
        setIsAuthenticated(true);
        await queryClient.invalidateQueries({ queryKey: ['workspace'] });
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

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [queryClient, setApiError, setCurrentUser, setIsAuthenticated, setIsLoading, setNeedsSetup]);

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
        await queryClient.invalidateQueries({ queryKey: ['workspace'] });
      } else {
        setApiError(result.message ?? 'Der opstod en fejl under login.');
      }
    },
    onError: (error: unknown) => {
      console.error('Login failed:', error);
      setApiError('Der opstod en fejl under login.');
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
      setIsLoading(false);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setProjects([]);
      setEmployees([]);
      setAllUsers([]);
      setIsSaving(false);
      queryClient.removeQueries({ queryKey: ['workspace'] });
    },
  });

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
    login: async (email: string, password: string) => {
      try {
        return await loginMutation.mutateAsync({ email, password });
      } catch (error: unknown) {
        console.error('Login mutation failed:', error);
        setApiError('Der opstod en fejl under login.');
        return { success: false, message: getErrorMessage(error) };
      }
    },
    logout: () => logoutMutation.mutateAsync(),
    register,
    completeSetup,
  };
};
