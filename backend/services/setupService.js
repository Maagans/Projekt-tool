import bcrypt from "bcryptjs";
import pool from "../db.js";
import { normalizeEmail } from "../utils/helpers.js";
import { createAppError } from "../utils/errors.js";
import { withTransaction } from "../utils/transactions.js";
import * as usersRepository from "../repositories/usersRepository.js";
import * as employeeRepository from "../repositories/employeeRepository.js";

export const needsInitialSetup = async () => {
    const adminCount = await usersRepository.countAdmins(pool);
    return adminCount === 0;
};

export const createFirstAdministrator = async ({ email, name, password }) => {
    const normalizedEmail = normalizeEmail(email);

    return withTransaction(async (client) => {
        const adminCount = await usersRepository.countAdmins(client);
        if (adminCount > 0) {
            throw createAppError('An administrator account already exists. Cannot create another.', 403);
        }

        let employeeId;
        const existingEmployee = await employeeRepository.findByEmail(client, normalizedEmail);
        if (existingEmployee) {
            employeeId = existingEmployee.id;
        } else {
            const createdEmployee = await employeeRepository.create(client, {
                id: undefined,
                name: name.trim(),
                email: normalizedEmail,
                location: '',
                department: '',
                maxCapacityHoursWeek: 0,
            });
            employeeId = createdEmployee?.id;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await usersRepository.create(client, {
            id: undefined,
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: 'Administrator',
            employeeId,
        });

        return { success: true };
    });
};
