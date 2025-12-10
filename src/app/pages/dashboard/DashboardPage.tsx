import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { PlusIcon, TrashIcon, UsersIcon, UserIcon, OrganizationIcon } from '../../../components/Icons';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const projectManager = useProjectManager();
  const {
    projects,
    createNewProject,
    deleteProject,
    logout,
    currentUser,
    isSaving,
    isWorkspaceFetching,
    apiError,
    canManage,
    isAdministrator,
    currentWorkspace,
  } = projectManager;
  const [newProjectName, setNewProjectName] = useState('');

  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((project) => project.status === 'active').length;
    const completed = projects.filter((project) => project.status === 'completed').length;
    const reports = projects.reduce((sum, project) => sum + project.reports.length, 0);
    return { total, active, completed, reports };
  }, [projects]);

  type NavItem = {
    label: string;
    description?: string;
    onClick: () => void;
    icon: ComponentType;
    variant?: 'default' | 'primary';
  };

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];

    if (canManage) {
      items.push({
        label: 'Database',
        description: 'Administrer medarbejdere og lokationer',
        onClick: () => navigate('/employees'),
        icon: UsersIcon,
      });
      items.push({
        label: 'PMO',
        description: 'Overblik over lokationer og kapacitet',
        onClick: () => navigate('/pmo'),
        icon: OrganizationIcon,
      });
    }

    if (isAdministrator) {
      items.push({
        label: 'Admin',
        description: 'Bruger- og adgangsstyring',
        onClick: () => navigate('/admin'),
        icon: UserIcon,
      });
    }

    return items;
  }, [canManage, isAdministrator, navigate]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProject = createNewProject(newProjectName.trim());
    if (newProject) {
      navigate(`/projects/${newProject.id}`);
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
  const [navCollapsed, setNavCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader
        title="Dashboard"
        user={currentUser}
        isSaving={isSaving}
        isRefreshing={isWorkspaceFetching}
        apiError={apiError}
        onLogout={logout}
      >
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/80 shadow-sm transition hover:bg-white/20"
          aria-label="Vis tips til brug af dashboardet"
          title="Hold øje med aktiviteten i dine projekter – tallene opdateres løbende via backend-synkronisering. Brug PMO-modulet til at forstå ressourcer på tværs af projekter, importer medarbejdere via CSV i Databasen, og eksporter ugerapporter som PDF fra projektsiden."
        >
          ?
        </button>
      </AppHeader>

      <div className="flex flex-col gap-6 px-2 pb-12 sm:px-4 lg:flex-row lg:px-6 xl:px-10">
        <aside
          className={`rounded-3xl bg-white p-4 shadow-sm transition-all duration-300 ${navCollapsed ? 'lg:w-20' : 'lg:w-72'
            } w-full lg:sticky lg:top-24 lg:self-start`}
        >
          <div className={`flex items-center ${navCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            {!navCollapsed && (
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</div>
            )}
            <button
              type="button"
              onClick={() => setNavCollapsed((state) => !state)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
              aria-label={navCollapsed ? 'Udvid navigation' : 'Sammenfold navigation'}
            >
              {navCollapsed ? '›' : '‹'}
            </button>
          </div>
          <nav className="mt-4 space-y-2">
            {navItems.length === 0 ? (
              <p className="text-sm text-slate-500">{navCollapsed ? 'Ingen genveje' : 'Ingen genveje tilgængelige.'}</p>
            ) : (
              navItems.map((item) => {
                const Icon = item.icon;
                const isPrimary = item.variant === 'primary';
                const baseButton =
                  'flex w-full items-center rounded-2xl border px-3 py-3 text-left text-sm font-semibold shadow-sm transition';
                const defaultStyles =
                  'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600';
                const primaryStyles = 'border-transparent bg-teal-500 text-white hover:bg-teal-600';
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    title={navCollapsed ? item.label : undefined}
                    className={`${baseButton} ${isPrimary ? primaryStyles : defaultStyles} ${navCollapsed ? 'justify-center' : 'justify-between'
                      }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${isPrimary ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                      >
                        <Icon />
                      </span>
                      {!navCollapsed && (
                        <span>
                          {item.label}
                          {item.description ? (
                            <span
                              className={`mt-0.5 block text-xs font-normal ${isPrimary ? 'text-white/80' : 'text-slate-500'
                                }`}
                            >
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </span>
                    {!navCollapsed && (
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isPrimary ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                          }`}
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </nav>
        </aside>

        <main className="flex-1 space-y-10">
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-white/80 backdrop-blur-md">
                    Hej {greetingName}
                  </span>
                  {currentWorkspace && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-white/80 backdrop-blur-md">
                      {currentWorkspace.name}
                    </span>
                  )}
                </div>
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

          <section className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => {
                const lastReport = project.reports[0];
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => navigate(`/projects/${project.id}`)}
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
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${project.status === 'completed'
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
        </main >
      </div >
    </div >
  );
};

export default DashboardPage;

