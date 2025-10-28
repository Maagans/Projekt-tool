import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { RESOURCES_ANALYTICS_ENABLED } from '../../constants';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { AnalyticsIcon, PlusIcon, TrashIcon, UsersIcon } from '../../../components/Icons';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const projectManager = useProjectManager();
  const { projects, createNewProject, deleteProject, logout, currentUser, isSaving, apiError, canManage, isAdministrator } =
    projectManager;
  const [newProjectName, setNewProjectName] = useState('');

  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((project) => project.status === 'active').length;
    const completed = projects.filter((project) => project.status === 'completed').length;
    const reports = projects.reduce((sum, project) => sum + project.reports.length, 0);
    return { total, active, completed, reports };
  }, [projects]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProject = createNewProject(newProjectName.trim());
    if (newProject) {
      navigate(`/projects/${newProject.id}/reports`);
    }
    setNewProjectName('');
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (!window.confirm(`Vil du slette projektet "${projectName}"? Dette fjerner alle tilknyttede rapporter.`)) {
      return;
    }
    deleteProject(projectId);
  };

  const greetingName = currentUser?.name?.split(' ')[0] ?? currentUser?.name ?? 'der';

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader title="Dashboard" user={currentUser} isSaving={isSaving} apiError={apiError} onLogout={logout}>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/80 shadow-sm transition hover:bg-white/20"
          aria-label="Vis tips til brug af dashboardet"
          title="Hold øje med aktiviteten i dine projekter – tallene opdateres automatisk via autosave. Brug PMO-modulet til at forstå ressourcer på tværs af projekter, importer medarbejdere via CSV i Databasen, og eksporter ugerapporter som PDF fra projektsiden."
        >
          ?
        </button>
        {canManage && (
          <button
            onClick={() => navigate('/employees')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
          >
            <UsersIcon /> Database
          </button>
        )}
        {canManage && (
          <button
            onClick={() => navigate('/pmo')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
          >
            PMO
          </button>
        )}
        {RESOURCES_ANALYTICS_ENABLED && isAdministrator && (
          <button
            onClick={() => navigate('/resources')}
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-teal-500/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition hover:bg-teal-500"
          >
            <AnalyticsIcon /> Ressource Analytics
          </button>
        )}
        {isAdministrator && (
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-purple-500/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:bg-purple-500"
          >
            Admin
          </button>
        )}
      </AppHeader>

      <main className="px-4 pb-12 sm:px-6 lg:px-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 px-6 py-10 text-white shadow-xl">
          <div
            className="absolute inset-0 opacity-30 blur-3xl"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.15), transparent 55%)',
            }}
          />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-white/80 backdrop-blur-md">
                Hej {greetingName}
              </span>
              <h2 className="mt-4 text-3xl font-semibold lg:text-4xl">Styr på projekter og ressourcer</h2>
              <p className="mt-3 max-w-xl text-white/80">
                Få indblik i fremdrift, bemanding og risici på tværs af organisationen. Opret nye projekter på få sekunder og
                følg dine teams tæt.
              </p>
              {canManage && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <div className="flex flex-1 items-center rounded-full bg-white/15 p-2 backdrop-blur">
                    <input
                      value={newProjectName}
                      onChange={(event) => setNewProjectName(event.target.value)}
                      placeholder="Nyt projekt: f.eks. Strategi 2026"
                      className="flex-1 rounded-full border-none bg-transparent px-4 text-white placeholder:text-white/60 focus:outline-none"
                    />
                    <button
                      onClick={handleCreateProject}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                    >
                      <PlusIcon /> Opret
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3 sm:max-w-md lg:max-w-xs">
              <div className="rounded-2xl bg-white/15 p-5 text-white shadow-lg backdrop-blur">
                <div className="text-xs uppercase text-white/70">Projekter</div>
                <div className="mt-2 text-3xl font-semibold">{metrics.total}</div>
                <div className="mt-1 text-xs text-white/70">Totalt antal</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-5 text-white shadow-lg backdrop-blur">
                <div className="text-xs uppercase text-white/70">Aktive</div>
                <div className="mt-2 text-3xl font-semibold">{metrics.active}</div>
                <div className="mt-1 text-xs text-white/70">Igangværende projekter</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-5 text-white shadow-lg backdrop-blur">
                <div className="text-xs uppercase text-white/70">Afsluttede</div>
                <div className="mt-2 text-3xl font-semibold">{metrics.completed}</div>
                <div className="mt-1 text-xs text-white/70">Fuldførte forløb</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-5 text-white shadow-lg backdrop-blur">
                <div className="text-xs uppercase text-white/70">Rapporter</div>
                <div className="mt-2 text-3xl font-semibold">{metrics.reports}</div>
                <div className="mt-1 text-xs text-white/70">Samlet antal ugerapporter</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const lastReport = project.reports[0];
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => navigate(`/projects/${project.id}/reports`)}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800">{project.config.projectName}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {project.config.projectStartDate} – {project.config.projectEndDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          project.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : project.status === 'on-hold'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {project.status === 'completed'
                          ? 'Fuldført'
                          : project.status === 'on-hold'
                            ? 'På hold'
                            : 'Aktiv'}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteProject(project.id, project.config.projectName);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          title="Slet projekt"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    {project.reports.length} rapport{project.reports.length === 1 ? '' : 'er'} Seneste uge:{' '}
                    {lastReport?.weekKey ?? 'Ikke oprettet'}
                  </p>
                  <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                    <span className="inline-flex items-center gap-2 text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      Se ugerapporter
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">Åbn</span>
                  </div>
                </button>
              );
            })}
          </div>

          {projects.length === 0 && !canManage && (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-slate-700">Ingen projekter endnu</h3>
              <p className="mt-2 text-sm text-slate-500">
                Når der oprettes projekter, vises de her på oversigten.
              </p>
            </div>
          )}

          {canManage && projects.length === 0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-slate-700">Start dit første projekt</h3>
              <p className="mt-2 text-sm text-slate-500">
                Navngiv projektet i feltet ovenfor og klik på Opret for at komme i gang.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
