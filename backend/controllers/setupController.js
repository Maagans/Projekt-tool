import { needsInitialSetup, createFirstAdministrator } from "../services/setupService.js";

export const getSetupStatus = async (req, res, next) => {
    try {
        const needsSetup = await needsInitialSetup();
        res.json({ needsSetup });
    } catch (error) {
        next(error);
    }
};

export const createFirstUser = async (req, res, next) => {
    try {
        const { email, name, password } = req.validatedBody ?? req.body ?? {};
        if (!email || !name || !password) {
            return res.status(400).json({ message: 'Email, name, and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        await createFirstAdministrator({ email, name, password });
        res.status(201).json({ success: true, message: 'Administrator account created successfully! You can now log in.' });
    } catch (error) {
        next(error);
    }
};
