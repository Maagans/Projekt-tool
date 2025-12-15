import { login as loginService, register as registerService, logout as logoutService } from "../services/authService.js";
import {
    AUTH_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    authCookieOptions,
    csrfCookieOptions,
    clearCookieOptions,
} from "../utils/cookies.js";

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.validatedBody ?? req.body ?? {};
        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const { token, csrfToken, user } = await loginService(email, password, ipAddress);

        res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
        res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);

        res.json({ success: true, user });
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

        res.clearCookie(AUTH_COOKIE_NAME, clearCookieOptions(authCookieOptions));
        res.clearCookie(CSRF_COOKIE_NAME, clearCookieOptions(csrfCookieOptions));

        res.json(result);
    } catch (error) {
        next(error);
    }
};
