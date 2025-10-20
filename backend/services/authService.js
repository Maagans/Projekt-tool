import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import logger from "../logger.js";
import { createAppError } from "../utils/errors.js";
import { normalizeEmail } from "../utils/helpers.js";
import { generateCsrfToken } from "../utils/cookies.js";
import { ensureEmployeeLinkForUser } from "./workspaceService.js";

const jwtSecret = process.env.JWT_SECRET;

export const login = async (email, password) => {
    if (!jwtSecret) {
        throw createAppError('JWT secret is not configured.', 500);
    }

    const normalizedEmail = normalizeEmail(email);
    const result = await pool.query(
        'SELECT id::text, name, email, role, password_hash, employee_id::text FROM users WHERE LOWER(email) = $1',
        [normalizedEmail],
    );
    const user = result.rows[0];
    if (!user) {
        logger.warn({ event: 'login_failed', reason: 'user_not_found' });
        throw createAppError('Login failed. Please check your email and password.', 401);
    }

    const isMatch = bcrypt.compareSync(password.trim(), user.password_hash.trim());
    if (!isMatch) {
        logger.warn({ event: 'login_failed', reason: 'password_mismatch', userId: user.id });
        throw createAppError('Login failed. Please check your email and password.', 401);
    }

    const enrichedUser = await ensureEmployeeLinkForUser(pool, {
        id: user.id,
        email: user.email,
        name: user.name,
        employeeId: user.employee_id ?? null,
    });

    const userPayload = {
        id: user.id,
        email: enrichedUser?.email ?? user.email,
        name: enrichedUser?.name ?? user.name,
        role: user.role,
        employeeId: enrichedUser?.employeeId ?? null,
    };

    const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '1d' });
    const csrfToken = generateCsrfToken();

    return { token, csrfToken, user: userPayload };
};

export const register = async (email, name, password) => {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existingUser.rowCount > 0) {
        throw createAppError('An account with this email already exists.', 409);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const passwordHash = await bcrypt.hash(password, 10);

        let employeeId = null;
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

        await client.query(
            'INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ($1, LOWER($2), $3, $4, $5::uuid)',
            [name.trim(), normalizedEmail, passwordHash, 'Teammedlem', employeeId],
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

export const logout = () => ({ success: true, message: 'Logged out successfully.' });
