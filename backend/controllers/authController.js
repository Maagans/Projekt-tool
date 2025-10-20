import { login as loginService, register as registerService, logout as logoutService } from "../services/authService.js";

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.validatedBody ?? req.body ?? {};
        const result = await loginService(email, password);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const register = async (req, res, next) => {
    try {
        const { email, name, password } = req.validatedBody ?? req.body ?? {};
        await registerService(email, name, password);
        res.status(201).json({ success: true, message: 'User created successfully! You can now log in.' });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        const result = logoutService();
        res.json(result);
    } catch (error) {
        next(error);
    }
};
