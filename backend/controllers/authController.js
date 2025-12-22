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

export const refreshSession = async (req, res, next) => {
    try {
        // User is already authenticated via authMiddleware
        const user = req.user;

        // Re-import jwt and config to sign new token
        const jwt = await import('jsonwebtoken');
        const { config } = await import('../config/index.js');
        const { generateCsrfToken } = await import('../utils/cookies.js');

        const userPayload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            employeeId: user.employeeId ?? null,
            workspaceId: user.workspaceId ?? null,
        };

        const token = jwt.default.sign(userPayload, config.jwtSecret, { expiresIn: '30m' });
        const csrfToken = generateCsrfToken();

        res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
        res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);

        res.json({ success: true, message: 'Session extended successfully.' });
    } catch (error) {
        next(error);
    }
};

export const switchWorkspace = async (req, res, next) => {
    try {
        const user = req.user;
        const { workspaceId } = req.body ?? {};

        if (!workspaceId) {
            return res.status(400).json({ success: false, message: 'workspaceId is required.' });
        }

        // Import pool to update user's workspace
        const pool = (await import('../db.js')).default;

        // Verify workspace exists and is active
        const workspaceResult = await pool.query(
            'SELECT id FROM workspaces WHERE id = $1::uuid AND is_active = true',
            [workspaceId]
        );

        if (workspaceResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Workspace not found or inactive.' });
        }

        // Update user's workspace_id in database
        await pool.query(
            'UPDATE users SET workspace_id = $1::uuid WHERE id = $2::uuid',
            [workspaceId, user.id]
        );

        // Re-issue JWT with new workspaceId
        const jwt = await import('jsonwebtoken');
        const { config } = await import('../config/index.js');
        const { generateCsrfToken } = await import('../utils/cookies.js');

        const userPayload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            employeeId: user.employeeId ?? null,
            workspaceId: workspaceId,
        };

        const token = jwt.default.sign(userPayload, config.jwtSecret, { expiresIn: '30m' });
        const csrfToken = generateCsrfToken();

        res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
        res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);

        res.json({ success: true, message: 'Workspace switched successfully.' });
    } catch (error) {
        next(error);
    }
};
