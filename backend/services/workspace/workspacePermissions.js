/**
 * Workspace Permissions Service
 * Extracted from workspaceService.js - handles permission checks and filtering
 */

/**
 * Apply workspace permissions based on user role
 * Filters projects the user can see and sets canEdit/canLogTime flags
 */
export const applyWorkspacePermissions = (workspace, user) => {
    if (!workspace || !user) {
        return workspace;
    }

    const isAdmin = user.role === 'admin' || user.role === 'pmo';
    const userEmployeeId = user.employeeId ?? null;

    const filteredProjects = workspace.projects
        .filter((project) => {
            // Admins and PMOs see all projects
            if (isAdmin) return true;
            // Regular users only see projects they're a member of
            return project.projectMembers.some((m) => m.employeeId === userEmployeeId);
        })
        .map((project) => {
            const isMember = project.projectMembers.some((m) => m.employeeId === userEmployeeId);
            const isLead = project.projectMembers.some(
                (m) => m.employeeId === userEmployeeId && m.isProjectLead,
            );

            return {
                ...project,
                permissions: {
                    canEdit: isAdmin || isLead,
                    canLogTime: isAdmin || isMember,
                },
            };
        });

    return {
        ...workspace,
        projects: filteredProjects,
    };
};

/**
 * Get list of project IDs the user can edit
 */
export const getUserEditableProjects = (workspace, user) => {
    if (!workspace || !user) {
        return new Set();
    }

    const isAdmin = user.role === 'admin' || user.role === 'pmo';
    const userEmployeeId = user.employeeId ?? null;

    if (isAdmin) {
        return new Set(workspace.projects.map((p) => p.id));
    }

    const editableIds = new Set();
    for (const project of workspace.projects) {
        const isLead = project.projectMembers.some(
            (m) => m.employeeId === userEmployeeId && m.isProjectLead,
        );
        if (isLead) {
            editableIds.add(project.id);
        }
    }
    return editableIds;
};

/**
 * Check if user has permission to edit a specific project
 */
export const canUserEditProject = (workspace, user, projectId) => {
    const editableIds = getUserEditableProjects(workspace, user);
    return editableIds.has(projectId);
};

/**
 * Check if user has permission to log time on a project
 */
export const canUserLogTimeOnProject = (workspace, user, projectId) => {
    if (!workspace || !user || !projectId) {
        return false;
    }

    const isAdmin = user.role === 'admin' || user.role === 'pmo';
    if (isAdmin) return true;

    const userEmployeeId = user.employeeId ?? null;
    const project = workspace.projects.find((p) => p.id === projectId);
    if (!project) return false;

    return project.projectMembers.some((m) => m.employeeId === userEmployeeId);
};
