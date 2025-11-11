import { ProjectOrganizationChart } from '../../../components/ProjectOrganizationChart';
import { SyncStatusPill } from '../../../components/SyncStatusPill';
import { ProjectResourcePanel } from './ProjectResourcePanel';
import { useProjectRouteContext } from './ProjectLayout';

export const ProjectOrganizationPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const actions = projectManager.projectActions(project.id, null);
  if (!actions) return null;
  const floatingSyncClass = 'fixed bottom-6 right-4 sm:right-6 pointer-events-none z-40 drop-shadow-lg';

  return (
    <>
      {projectManager.isSaving && (
        <SyncStatusPill message="Synkroniserer organisationsændringer..." className={floatingSyncClass} />
      )}
      <div className="space-y-6">
        <ProjectResourcePanel />
        <ProjectOrganizationChart
          project={project}
          members={project.projectMembers}
          allEmployees={projectManager.employees}
          canManageMembers={projectManager.canManage}
          canLogTime={project.permissions?.canLogTime ?? false}
          currentUserEmployeeId={projectManager.currentUser?.employeeId ?? null}
          isSaving={projectManager.isSaving}
          onAssignEmployee={actions.organizationManager.assignEmployee}
          onUpdateMember={actions.organizationManager.updateMember}
          onDeleteMember={actions.organizationManager.deleteMember}
          onUpdateTimeLog={actions.organizationManager.updateTimeLog}
          onBulkUpdateTimeLog={actions.organizationManager.bulkUpdateTimeLog}
        />
      </div>
    </>
  );
};

export default ProjectOrganizationPage;
