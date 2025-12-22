import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StatusToast } from '../components/ui/StatusToast';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { SessionTimeoutModal } from '../components/SessionTimeoutModal';
import { useProjectManager } from '../hooks/useProjectManager';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { GlobalErrorScreen } from './components/GlobalErrorScreen';
import { LoginPage } from './pages/auth/LoginPage';
import { RegistrationPage } from './pages/auth/RegistrationPage';
import FirstTimeSetupPage from './pages/setup/FirstTimeSetupPage';
import { PROJECT_RISK_ANALYSIS_ENABLED } from './constants';
import { AppLayout } from './components/layout/AppLayout';

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const EmployeePage = lazy(() => import('./pages/employees/EmployeePage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const PmoPage = lazy(() => import('./pages/pmo/PmoPage'));
const ProjectLayout = lazy(() => import('./pages/projects/ProjectLayout'));
const ProjectReportsPage = lazy(
  () => import('./pages/projects/ProjectReportsPage').then((module) => ({ default: module.ProjectReportsPage })),
);
const ProjectOverviewPage = lazy(
  () => import('./pages/projects/ProjectOverviewPage').then((module) => ({ default: module.ProjectOverviewPage })),
);
const ProjectOrganizationPage = lazy(
  () => import('./pages/projects/ProjectOrganizationPage').then((module) => ({ default: module.ProjectOrganizationPage })),
);
const ProjectSettingsPage = lazy(
  () => import('./pages/projects/ProjectSettingsPage').then((module) => ({ default: module.ProjectSettingsPage })),
);
const ProjectRisksPage = lazy(
  () => import('./pages/projects/ProjectRisksPage').then((module) => ({ default: module.ProjectRisksPage })),
);
const MilestonePlanPage = lazy(
  () => import('./pages/projects/MilestonePlanPage').then((module) => ({ default: module.MilestonePlanPage })),
);
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const RouteLoader = () => (
  <div className="flex items-center justify-center py-20">
    <svg className="h-8 w-8 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
);

export const AppShell = () => {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showApiToast, setShowApiToast] = useState(false);
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
  const location = useLocation();
  const projectManager = useProjectManager();
  const {
    isAuthenticated,
    isBootstrapping,
    apiError,
    projects,
    isAdministrator,
    canManage,
    needsSetup,
    completeSetup,
    shouldRedirectToLogin,
    acknowledgeLogoutRedirect,
    logout,
  } = projectManager;

  // Session timeout handling
  const { showModal: showTimeoutModal, secondsRemaining, extendSession } = useSessionTimeout(
    isAuthenticated,
    logout
  );

  useEffect(() => {
    setShowApiToast(Boolean(apiError));
  }, [apiError]);

  const handleGlobalError = useCallback((error: Error) => {
    setGlobalError(error.message || 'Der opstod en uventet fejl.');
    setShowApiToast(false);
  }, []);

  const clearGlobalError = useCallback(() => setGlobalError(null), []);

  useEffect(() => {
    if (shouldRedirectToLogin) {
      setAuthPage('login');
      acknowledgeLogoutRedirect();
    }
  }, [acknowledgeLogoutRedirect, shouldRedirectToLogin]);

  // Public routes that don't require authentication
  const isPublicRoute = location.pathname === '/forgot-password' || location.pathname.startsWith('/reset-password');

  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center h-screen">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  if (needsSetup) {
    return <FirstTimeSetupPage onSetupComplete={completeSetup} />;
  }

  // Handle public routes (forgot password, reset password)
  if (!isAuthenticated && isPublicRoute) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    if (shouldRedirectToLogin) {
      return <Navigate to="/login" replace />;
    }
    return authPage === 'login' ? (
      <LoginPage onLogin={projectManager.login} onNavigateToRegister={() => setAuthPage('register')} />
    ) : (
      <RegistrationPage onRegister={projectManager.register} onNavigateToLogin={() => setAuthPage('login')} />
    );
  }

  if (apiError && !projects.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Fejl ved indlÃ¦sning af data</h2>
          <p className="text-slate-600">{apiError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
          >
            PrÃ¸v igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Session Timeout Modal */}
      {showTimeoutModal && (
        <SessionTimeoutModal
          secondsRemaining={secondsRemaining}
          onExtend={extendSession}
          onLogout={logout}
        />
      )}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
        {apiError && showApiToast && (
          <StatusToast
            title="Forbindelse mistet"
            message={apiError}
            variant="warning"
            onClose={() => setShowApiToast(false)}
          />
        )}
        {globalError && (
          <StatusToast title="Uventet fejl" message={globalError} variant="error" onClose={clearGlobalError} />
        )}
      </div>

      <ErrorBoundary
        onError={handleGlobalError}
        fallback={({ reset, error, errorInfo }) => (
          <GlobalErrorScreen
            onRetry={() => {
              clearGlobalError();
              reset();
            }}
            onReload={() => {
              clearGlobalError();
              reset();
              window.location.reload();
            }}
            error={error}
            errorInfo={errorInfo}
          />
        )}
      >
        <AppLayout>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/employees" element={canManage ? <EmployeePage /> : <Navigate to="/" replace />} />
              <Route path="/pmo" element={canManage ? <PmoPage /> : <Navigate to="/" replace />} />
              <Route path="/resources" element={<Navigate to="/pmo?view=resources" replace />} />
              <Route path="/admin" element={isAdministrator ? <AdminPage /> : <Navigate to="/" replace />} />
              <Route path="/admin/audit-logs" element={isAdministrator ? <AuditLogPage /> : <Navigate to="/" replace />} />
              <Route path="/projects/:projectId" element={<ProjectLayout />}>
                <Route index element={<ProjectOverviewPage />} />
                <Route path="reports" element={<ProjectReportsPage />} />
                <Route path="plan" element={<MilestonePlanPage />} />
                <Route path="organization" element={<ProjectOrganizationPage />} />
                {PROJECT_RISK_ANALYSIS_ENABLED && <Route path="risks" element={<ProjectRisksPage />} />}
                <Route
                  path="settings"
                  element={canManage ? <ProjectSettingsPage /> : <Navigate to="../reports" replace />}
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </ErrorBoundary>
    </>
  );
};

export default AppShell;


