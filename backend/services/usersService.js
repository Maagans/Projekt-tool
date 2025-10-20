import pool from "../db.js";
import { createAppError } from "../utils/errors.js";

export const listUsers = async () => {
    const result = await pool.query('SELECT id::text, name, email, role FROM users ORDER BY name');
    return result.rows;
};

export const updateUserRole = async (id, role, performingUser) => {
    if (!['Administrator', 'Projektleder', 'Teammedlem'].includes(role)) {
        throw createAppError('Invalid role specified.', 400);
    }

    if (String(performingUser.id) === String(id) && performingUser.role === 'Administrator' && role !== 'Administrator') {
        throw createAppError('Forbidden: Administrators cannot change their own role.', 403);
    }

    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2::uuid RETURNING id', [role, id]);
    if (result.rowCount === 0) {
        throw createAppError('User not found.', 404);
    }

    return { success: true, message: 'User role updated.' };
};
