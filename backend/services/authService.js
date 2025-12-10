import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import logger from "../logger.js";
import { createAppError } from "../utils/errors.js";
import { generateCsrfToken } from "../utils/cookies.js";
import { ensureEmployeeLinkForUser } from "./workspaceService.js";
import { withTransaction } from "../utils/transactions.js";
import { config } from "../config/index.js";
import { loginSchema, registerSchema } from "../validators/authValidators.js";
import * as userRepository from "../repositories/userRepository.js";
import * as employeeRepository from "../repositories/employeeRepository.js";

const jwtSecret = config.jwtSecret;

export const login = async (email, password) => {
    if (!jwtSecret) {
        throw createAppError('JWT secret is not configured.', 500);
    }

    const { email: normalizedEmail, password: sanitizedPassword } = loginSchema.parse({ email, password });
    const user = await userRepository.findByEmail(pool, normalizedEmail);
    if (!user) {
        logger.warn({ event: 'login_failed', reason: 'user_not_found' });
        throw createAppError('Login failed. Please check your email and password.', 401);
    }

    const isMatch = bcrypt.compareSync(sanitizedPassword, user.password_hash.trim());
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
        workspaceId: user.workspace_id ?? null,
    };

    const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '1d' });
    const csrfToken = generateCsrfToken();

    return { token, csrfToken, user: userPayload };
};

export const register = async (email, name, password) => {
    const { email: normalizedEmail, name: sanitizedName, password: sanitizedPassword } = registerSchema.parse({
        email,
        name,
        password,
    });
    const exists = await userRepository.existsByEmail(pool, normalizedEmail);
    if (exists) {
        throw createAppError('An account with this email already exists.', 409);
    }

    return withTransaction(async (client) => {
        const passwordHash = await bcrypt.hash(sanitizedPassword, 10);

        let employeeId = null;
        const existingEmployee = await employeeRepository.findByEmail(client, normalizedEmail);
        if (existingEmployee) {
            employeeId = existingEmployee.id;
        } else {
            const createdEmployee = await employeeRepository.create(client, {
                id: undefined,
                name: sanitizedName,
                email: normalizedEmail,
                location: '',
                department: '',
                maxCapacityHoursWeek: 0,
            });
            employeeId = createdEmployee?.id ?? null;
        }

        await userRepository.create(client, {
            id: undefined,
            name: sanitizedName,
            email: normalizedEmail,
            passwordHash,
            role: 'Teammedlem',
            employeeId,
        });

        return { success: true };
    });
};

export const logout = () => ({ success: true, message: 'Logged out successfully.' });
