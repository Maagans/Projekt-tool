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
        await createFirstAdministrator({ email, name, password });
        res.status(201).json({ success: true, message: "Administrator account created successfully! You can now log in." });
    } catch (error) {
        next(error);
    }
};
