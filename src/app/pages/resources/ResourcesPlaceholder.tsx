import { Navigate, useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { RESOURCES_ANALYTICS_ENABLED } from '../../constants';
import { useProjectManager } from '../../../hooks/useProjectManager';

export const ResourcesPlaceholder = () => {
  const navigate = useNavigate();
  const projectManager = useProjectManager();
  const { logout, currentUser, isSaving, apiError, isAdministrator } = projectManager;

  if (!RESOURCES_ANALYTICS_ENABLED || !isAdministrator) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <AppHeader title="Ressource Analytics (preview)" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
        <button onClick={() => navigate('/')} className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-md hover:bg-slate-300">
          Tilbage til Dashboard
        </button>
      </AppHeader>
      <main className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <p className="text-slate-600">
          Ressource analytics-modulet er aktiveret, men selve funktionaliteten er endnu under udvikling. Denne side fungerer som et
          preview, mens backend-aggregationen og visualiseringerne færdiggøres.
        </p>
        <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1">
          <li>
            API-endpointet <code>/api/analytics/resources</code> returnerer midlertidigt status 501 (Not Implemented).
          </li>
            <li>Følgende opgaver dækker den videre implementering: RM-002 (aggregation), RM-003 (API) og RM-005 (frontend UI).</li>
        </ul>
        <p className="text-sm text-slate-500 border border-dashed border-slate-200 p-3 rounded-md bg-slate-50">
          Fjern feature-flagget <code>RESOURCES_ANALYTICS_ENABLED</code> eller sæt det til <code>false</code>, hvis modulet ikke
          skal eksponeres endnu.
        </p>
      </main>
    </div>
  );
};

export default ResourcesPlaceholder;
