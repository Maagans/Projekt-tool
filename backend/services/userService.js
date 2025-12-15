import pool from "../db.js";
import { createAppError } from "../utils/errors.js";
import { updateUserRoleSchema } from "../validators/usersValidators.js";
import { USER_ROLES } from "../constants/roles.js";
import { logAction } from "./auditLogService.js";

export const listUsers = async () => {
    const result = await pool.query('SELECT id::text, name, email, role, workspace_id::text AS "workspaceId" FROM users ORDER BY name');
    return result.rows;
};

export const updateUserRole = async (id, role, performingUser) => {
    const { id: targetUserId, role: parsedRole } = updateUserRoleSchema.parse({ id, role });

    if (String(performingUser.id) === String(targetUserId) && performingUser.role === USER_ROLES.ADMIN && parsedRole !== USER_ROLES.ADMIN) {
        throw createAppError('Forbidden: Administrators cannot change their own role.', 403);
    }

    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2::uuid RETURNING id, name', [parsedRole, targetUserId]);
    if (result.rowCount === 0) {
        throw createAppError('User not found.', 404);
    }

    // Log the role change
    await logAction(pool, {
        userId: performingUser.id,
        userName: performingUser.name,
        userRole: performingUser.role,
        workspaceId: performingUser.workspaceId,
        action: 'UPDATE',
        entityType: 'user',
        entityId: targetUserId,
        entityName: result.rows[0].name,
        description: `Ændrede rolle til '${parsedRole}' for bruger '${result.rows[0].name}'`,
        ipAddress: null
    });

    return { success: true, message: 'User role updated.' };
};

export const updateUserWorkspace = async (id, workspaceId, performingUser) => {
    // Only admins can change workspace assignments
    if (performingUser.role !== USER_ROLES.ADMIN) {
        throw createAppError('Forbidden: Only administrators can change workspace assignments.', 403);
    }

    const result = await pool.query(
        'UPDATE users SET workspace_id = $1::uuid WHERE id = $2::uuid RETURNING id, name',
        [workspaceId, id]
    );
    if (result.rowCount === 0) {
        throw createAppError('User not found.', 404);
    }

    // Log the workspace change
    await logAction(pool, {
        userId: performingUser.id,
        userName: performingUser.name,
        userRole: performingUser.role,
        workspaceId: performingUser.workspaceId,
        action: 'UPDATE',
        entityType: 'user',
        entityId: id,
        entityName: result.rows[0].name,
        description: `Ændrede workspace for bruger '${result.rows[0].name}'`,
        ipAddress: null
    });

    return { success: true, message: 'User workspace updated.' };
};
