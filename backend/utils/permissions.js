/**
 * Permission Utility
 * Centralized permission checking functions
 * TD-2: Replace scattered user.role === checks
 */

import { USER_ROLES } from '../constants/roles.js';

/**
 * Check if user is an administrator
 */
export const isAdmin = (user) => user?.role === USER_ROLES.ADMIN;

/**
 * Check if user has PMO-level access (Admin or future PMO role)
 * Used for full read/write access across workspace
 */
export const isPMO = (user) => {
    const pmoRoles = [USER_ROLES.ADMIN];
    // Future: Add USER_ROLES.PMO when role is added
    return pmoRoles.includes(user?.role);
};

/**
 * Check if user is a project leader
 */
export const isProjectLeader = (user) => user?.role === USER_ROLES.PROJECT_LEADER;

/**
 * Check if user is a team member
 */
export const isTeamMember = (user) => user?.role === USER_ROLES.TEAM_MEMBER;

/**
 * Check if user can edit a specific project
 * Admins can edit all, project leads can edit their own
 */
export const canEditProject = (user, project) => {
    if (!user) return false;
    if (isAdmin(user)) return true;

    const employeeId = user.employeeId ?? null;
    if (!employeeId) return false;

    // Check if user is project lead on this project
    return project?.projectMembers?.some(
        (m) => m.employeeId === employeeId && m.isProjectLead,
    );
};

/**
 * Check if user can view a project
 * Admins see all, others see projects they're members of
 */
export const canViewProject = (user, project) => {
    if (!user) return false;
    if (isPMO(user)) return true;

    const employeeId = user.employeeId ?? null;
    if (!employeeId) return false;

    return project?.projectMembers?.some((m) => m.employeeId === employeeId);
};

/**
 * Check if user can log time on a project
 * Must be a member of the project or admin
 */
export const canLogTime = (user, project) => {
    if (!user) return false;
    if (isAdmin(user)) return true;

    const employeeId = user.employeeId ?? null;
    if (!employeeId) return false;

    return project?.projectMembers?.some((m) => m.employeeId === employeeId);
};

/**
 * Check if user can manage employees (CRUD operations)
 */
export const canManageEmployees = (user) => isAdmin(user);

/**
 * Check if user can manage users (role changes, etc)
 */
export const canManageUsers = (user) => isAdmin(user);

/**
 * Check if user can edit workspace settings
 */
export const canEditWorkspaceSettings = (user) => isAdmin(user);

/**
 * Check if user can create/delete projects
 */
export const canManageProjects = (user) => isPMO(user);

/**
 * Assert admin access - throws if not admin
 */
export const assertAdmin = (user) => {
    if (!isAdmin(user)) {
        const error = new Error('Access denied. Administrator privileges required.');
        error.status = 403;
        throw error;
    }
};

/**
 * Assert PMO access - throws if not PMO level
 */
export const assertPMO = (user) => {
    if (!isPMO(user)) {
        const error = new Error('Access denied. PMO privileges required.');
        error.status = 403;
        throw error;
    }
};
