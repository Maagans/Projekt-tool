import { useCallback } from 'react';
import { api } from '../../api';
import type { ProjectManagerStore } from './store';
import { getErrorMessage } from './utils';
import type { UserRole } from '../../types';

export const useAdminModule = (store: ProjectManagerStore) => {
  const { currentUser, setAllUsers, setApiError } = store;

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

  return {
    allUsers: store.allUsers,
    fetchAllUsers,
    updateUserRole,
  };
};
