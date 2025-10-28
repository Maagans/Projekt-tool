import { ProjectOrganizationChart } from '../../../components/ProjectOrganizationChart';
import { useProjectRouteContext } from './ProjectLayout';

export const ProjectOrganizationPage = () => {
  const { project, projectManager } = useProjectRouteContext();
  const actions = projectManager.projectActions(project.id, null);
  if (!actions) return null;

  return (
    <ProjectOrganizationChart
      project={project}
      members={project.projectMembers}
      allEmployees={projectManager.employees}
      canManageMembers={projectManager.canManage}
      canLogTime={project.permissions?.canLogTime ?? false}
      currentUserEmployeeId={projectManager.currentUser?.employeeId ?? null}
      onAssignEmployee={actions.organizationManager.assignEmployee}
      onUpdateMember={actions.organizationManager.updateMember}
      onDeleteMember={actions.organizationManager.deleteMember}
      onUpdateTimeLog={actions.organizationManager.updateTimeLog}
      onBulkUpdateTimeLog={actions.organizationManager.bulkUpdateTimeLog}
    />
  );
};

export default ProjectOrganizationPage;

