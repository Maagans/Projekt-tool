import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { useProjectManager } from '../../../hooks/useProjectManager';
import type { UserRole } from '../../../types';

export const AdminPage = () => {
  const navigate = useNavigate();
  const projectManager = useProjectManager();
  const {
    allUsers,
    workspaces,
    fetchAllUsers,
    fetchWorkspaces,
    updateUserRole,
    updateUserWorkspace,
    currentUser,
    logout,
    isSaving,
    isWorkspaceFetching,
    apiError,
  } = projectManager;
  const roles: UserRole[] = ['Administrator', 'Projektleder', 'Teammedlem'];

  useEffect(() => {
    fetchAllUsers();
    fetchWorkspaces();
  }, [fetchAllUsers, fetchWorkspaces]);

  return (
    <div>
      <AppHeader
        title="Brugeradministration"
        user={currentUser}
        isSaving={isSaving}
        isRefreshing={isWorkspaceFetching}
        apiError={apiError}
        onLogout={logout}
      >
        <button onClick={() => navigate('/')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">
          Tilbage til Dashboard
        </button>
      </AppHeader>
      <main className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-sm text-slate-600 mb-4">Her kan du administrere roller og workspaces for alle brugere i systemet.</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="p-2 text-left text-sm font-semibold text-slate-600">Navn</th>
                <th className="p-2 text-left text-sm font-semibold text-slate-600">Email</th>
                <th className="p-2 text-left text-sm font-semibold text-slate-600 w-40">Rolle</th>
                <th className="p-2 text-left text-sm font-semibold text-slate-600 w-48">Workspace</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 font-medium">{user.name}</td>
                  <td className="p-2 text-slate-600">{user.email}</td>
                  <td className="p-2">
                    <select
                      value={user.role}
                      onChange={(event) => updateUserRole(user.id, event.target.value as UserRole)}
                      className="bg-white border border-slate-300 rounded-md p-1.5 text-sm w-full"
                      disabled={currentUser?.id === user.id}
                      title={currentUser?.id === user.id ? 'Administratorer kan ikke nedgradere sig selv' : 'Skift rolle'}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      value={user.workspaceId ?? ''}
                      onChange={(event) => updateUserWorkspace(user.id, event.target.value)}
                      className="bg-white border border-slate-300 rounded-md p-1.5 text-sm w-full"
                      title="Vælg workspace"
                    >
                      <option value="" disabled>-- Vælg --</option>
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
