
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { DashboardHero } from './components/DashboardHero';
import { ProjectCardNew } from './components/ProjectCardNew';
import { CreateProjectModal } from './components/CreateProjectModal';

const DashboardPage = () => {
  const navigate = useNavigate();
  const projectManager = useProjectManager();
  const {
    projects,
    createNewProject,
    currentUser,
    isSaving,
    isWorkspaceFetching,
    canManage,
  } = projectManager;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateProject = (name: string, startDate: string, endDate: string) => {
    const newProject = createNewProject(name, {
      projectStartDate: startDate,
      projectEndDate: endDate,
    });
    if (newProject) {
      // Navigate to project overview
      navigate(`/projects/${newProject.id}`);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      <DashboardHero
        user={currentUser}
        isSyncing={isSaving || isWorkspaceFetching}
      />

      <section>
        <div className="section-header flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Aktive Projekter</h2>

          {canManage && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-teal-600 text-white px-5 py-2 rounded-lg font-medium text-sm cursor-pointer transition-all duration-200 shadow-sm hover:bg-teal-700 hover:shadow-md"
            >
              + Opret Projekt
            </button>
          )}
        </div>

        <div className="project-grid grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          {projects.map((project, index) => {
            const themes = ['teal', 'purple', 'amber'] as const;
            const theme = themes[index % themes.length];

            return (
              <ProjectCardNew
                key={project.id}
                project={project}
                colorTheme={theme}
              />
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-700">Ingen projekter endnu</h3>
            <p className="mt-2 text-sm text-slate-500">
              Når der oprettes projekter, vises de her på oversigten.
            </p>
            {canManage && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 bg-teal-600 text-white px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:bg-teal-700"
              >
                Opret dit første projekt
              </button>
            )}
          </div>
        )}
      </section>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
};

export default DashboardPage;
