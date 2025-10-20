import bcrypt from "bcryptjs";
import pool from "../db.js";
import { normalizeEmail } from "../utils/helpers.js";
import { createAppError } from "../utils/errors.js";

export const needsInitialSetup = async () => {
    const result = await pool.query("SELECT COUNT(*)::int AS admin_count FROM users WHERE role = 'Administrator'");
    return (result.rows[0]?.admin_count ?? 0) === 0;
};

export const createFirstAdministrator = async ({ email, name, password }) => {
    const normalizedEmail = normalizeEmail(email);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const adminCountResult = await client.query("SELECT COUNT(*)::int AS admin_count FROM users WHERE role = 'Administrator'");
        if ((adminCountResult.rows[0]?.admin_count ?? 0) > 0) {
            throw createAppError('An administrator account already exists. Cannot create another.', 403);
        }

        let employeeId;
        const employeeResult = await client.query('SELECT id::text FROM employees WHERE LOWER(email) = $1', [normalizedEmail]);
        if (employeeResult.rowCount > 0) {
            employeeId = employeeResult.rows[0].id;
        } else {
            const insertEmployee = await client.query(
                'INSERT INTO employees (name, email) VALUES ($1, LOWER($2)) RETURNING id::text',
                [name.trim(), normalizedEmail],
            );
            employeeId = insertEmployee.rows[0].id;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await client.query(
            'INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ($1, LOWER($2), $3, $4, $5::uuid)',
            [name.trim(), normalizedEmail, passwordHash, 'Administrator', employeeId],
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return { success: true };
};
