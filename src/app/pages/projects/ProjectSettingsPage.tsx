import { EditableField } from '../../../components/EditableField';
import type { ProjectStatus } from '../../../types';
import { useProjectRouteContext } from './ProjectLayout';

export const ProjectSettingsPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const { updateProjectConfig, updateProjectStatus } = projectManager;

  const projectStatusOptions: { key: ProjectStatus; label: string }[] = [
    { key: 'active', label: 'Aktiv' },
    { key: 'completed', label: 'Fuldført' },
    { key: 'on-hold', label: 'På hold' },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-bold mb-4 text-slate-700">Projektindstillinger</h3>
      <div className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Projektnavn</label>
          <EditableField
            initialValue={project.config.projectName}
            onSave={(newName) => updateProjectConfig(project.id, { projectName: newName })}
            className="text-lg"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Startdato</label>
            <input
              type="date"
              value={project.config.projectStartDate}
              onChange={(event) => updateProjectConfig(project.id, { projectStartDate: event.target.value })}
              className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full"
              style={{ colorScheme: 'light' }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Slutdato</label>
            <input
              type="date"
              value={project.config.projectEndDate}
              onChange={(event) => updateProjectConfig(project.id, { projectEndDate: event.target.value })}
              className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full"
              style={{ colorScheme: 'light' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Projektstatus</label>
          <select
            value={project.status}
            onChange={(event) => updateProjectStatus(project.id, event.target.value as ProjectStatus)}
            className="bg-white border border-slate-300 rounded-md p-2 text-sm w-full"
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
  );
};

export default ProjectSettingsPage;

