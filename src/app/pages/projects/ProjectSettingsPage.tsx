import { EditableField } from '../../../components/EditableField';
import { SyncStatusPill } from '../../../components/SyncStatusPill';
import type { ProjectStatus } from '../../../types';
import { useProjectRouteContext } from './ProjectLayout';

export const ProjectSettingsPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const { updateProjectConfig, updateProjectStatus, isSaving } = projectManager;
  const floatingSyncClass = 'fixed bottom-6 right-4 sm:right-6 pointer-events-none z-40 drop-shadow-lg';

  const projectStatusOptions: { key: ProjectStatus; label: string }[] = [
    { key: 'active', label: 'Aktiv' },
    { key: 'completed', label: 'Fuldført' },
    { key: 'on-hold', label: 'På hold' },
  ];

  return (
    <>
      {isSaving && <SyncStatusPill message="Synkroniserer projektændringer..." className={floatingSyncClass} />}
      <div className="bg-white p-4 rounded-lg shadow-sm" aria-busy={isSaving}>
        <h3 className="text-lg font-bold mb-4 text-slate-700">Projektindstillinger</h3>
      <div className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Projektnavn</label>
          <EditableField
            initialValue={project.config.projectName}
            onSave={(newName) => updateProjectConfig(project.id, { projectName: newName })}
            className="text-lg"
            disabled={isSaving}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Startdato</label>
            <input
              type="date"
              value={project.config.projectStartDate}
              onChange={(event) => updateProjectConfig(project.id, { projectStartDate: event.target.value })}
              disabled={isSaving}
              className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
              style={{ colorScheme: 'light' }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Slutdato</label>
            <input
              type="date"
              value={project.config.projectEndDate}
              onChange={(event) => updateProjectConfig(project.id, { projectEndDate: event.target.value })}
              disabled={isSaving}
              className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
              style={{ colorScheme: 'light' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Projektstatus</label>
          <select
            value={project.status}
            onChange={(event) => updateProjectStatus(project.id, event.target.value as ProjectStatus)}
            disabled={isSaving}
            className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            {projectStatusOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
    </>
  );
};

export default ProjectSettingsPage;
