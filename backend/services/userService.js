import pool from "../db.js";
import { createAppError } from "../utils/errors.js";
import { updateUserRoleSchema } from "../validators/usersValidators.js";
import { USER_ROLES } from "../constants/roles.js";

export const listUsers = async () => {
    const result = await pool.query('SELECT id::text, name, email, role FROM users ORDER BY name');
    return result.rows;
};

export const updateUserRole = async (id, role, performingUser) => {
    const { id: targetUserId, role: parsedRole } = updateUserRoleSchema.parse({ id, role });

    if (String(performingUser.id) === String(targetUserId) && performingUser.role === USER_ROLES.ADMIN && parsedRole !== USER_ROLES.ADMIN) {
        throw createAppError('Forbidden: Administrators cannot change their own role.', 403);
    }

    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2::uuid RETURNING id', [parsedRole, targetUserId]);
    if (result.rowCount === 0) {
        throw createAppError('User not found.', 404);
    }

    return { success: true, message: 'User role updated.' };
};
