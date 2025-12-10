import { useCallback, useState } from 'react';
import { api } from '../../api';
import type { ProjectManagerStore } from './store';
import { getErrorMessage } from './utils';
import type { UserRole } from '../../types';
import type { Workspace } from '../../api/adminApi';

export const useAdminModule = (store: ProjectManagerStore) => {
  const { currentUser, setAllUsers, setApiError } = store;
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const fetchAllUsers = useCallback(async () => {
    if (currentUser?.role !== 'Administrator') return;
    try {
      const users = await api.getUsers();
      setAllUsers(users);
    } catch (error: unknown) {
      console.error('Failed to fetch users:', error);
      setApiError('Kunne ikke hente brugerliste.');
    }
  }, [currentUser?.role, setAllUsers, setApiError]);

  const fetchWorkspaces = useCallback(async () => {
    if (currentUser?.role !== 'Administrator') return;
    try {
      const ws = await api.getWorkspaces();
      setWorkspaces(ws);
    } catch (error: unknown) {
      console.error('Failed to fetch workspaces:', error);
    }
  }, [currentUser?.role]);

  const updateUserRole = useCallback(
    async (userId: string, role: UserRole) => {
      if (currentUser?.role !== 'Administrator') return;
      try {
        await api.updateUserRole(userId, role);
        setAllUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
      } catch (error: unknown) {
        console.error('Failed to update user role:', error);
        setApiError(`Fejl: ${getErrorMessage(error)}`);
      }
    },
    [currentUser?.role, setAllUsers, setApiError],
  );

  const updateUserWorkspace = useCallback(
    async (userId: string, workspaceId: string) => {
      if (currentUser?.role !== 'Administrator') return;
      try {
        await api.updateUserWorkspace(userId, workspaceId);
        setAllUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, workspaceId } : user)));
      } catch (error: unknown) {
        console.error('Failed to update user workspace:', error);
        setApiError(`Fejl: ${getErrorMessage(error)}`);
      }
    },
    [currentUser?.role, setAllUsers, setApiError],
  );

  return {
    allUsers: store.allUsers,
    workspaces,
    fetchAllUsers,
    fetchWorkspaces,
    updateUserRole,
    updateUserWorkspace,
  };
};
