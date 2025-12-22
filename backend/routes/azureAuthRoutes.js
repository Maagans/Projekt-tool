/**
 * Azure AD SSO Routes
 * Layer 1: Controller - No business logic, delegates to service
 */

import { Router } from 'express';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import {
    isAzureOidcConfigured,
    getAuthorizationUrl,
    exchangeCodeForTokens,
    decodeIdToken,
    findOrCreateUser,
} from '../services/azureAuthService.js';
import {
    AUTH_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    authCookieOptions,
    csrfCookieOptions,
    generateCsrfToken,
} from '../utils/cookies.js';

const router = Router();

// Store OIDC state temporarily (in production, use Redis or session storage)
const pendingStates = new Map();

/**
 * GET /api/auth/azure/login
 * Initiates Azure AD SSO flow - redirects to Microsoft login
 */
router.get('/login', (req, res) => {
    if (!isAzureOidcConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'Azure SSO is not configured.',
        });
    }

    // Generate random state for CSRF protection
    const state = randomBytes(32).toString('hex');
    pendingStates.set(state, {
        timestamp: Date.now(),
        returnUrl: req.query.returnUrl || '/',
    });

    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of pendingStates.entries()) {
        if (value.timestamp < tenMinutesAgo) {
            pendingStates.delete(key);
        }
    }

    const authUrl = getAuthorizationUrl(state);
    res.redirect(authUrl);
});

/**
 * GET /api/auth/azure/callback
 * Handles Azure AD callback with authorization code
 */
router.get('/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    // Handle Azure AD errors
    if (error) {
        console.error('[azureAuth] Azure AD error:', error, error_description);
        return res.redirect(`/?error=azure_auth_failed&message=${encodeURIComponent(error_description || error)}`);
    }

    // Validate state
    if (!state || !pendingStates.has(state)) {
        console.error('[azureAuth] Invalid or expired state');
        return res.redirect('/?error=invalid_state');
    }

    const stateData = pendingStates.get(state);
    pendingStates.delete(state);

    // Check state is not too old (10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        return res.redirect('/?error=state_expired');
    }

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // Exchange code for tokens
        const { idToken } = await exchangeCodeForTokens(code);

        // Decode and validate ID token
        const azureUser = decodeIdToken(idToken);

        // Find or create user
        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const user = await findOrCreateUser(azureUser, ipAddress);

        // Create JWT token
        const userPayload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            employeeId: user.employee_id ?? null,
            workspaceId: user.workspace_id ?? null,
        };

        const token = jwt.sign(userPayload, config.jwtSecret, { expiresIn: '30m' });
        const csrfToken = generateCsrfToken();

        // Set cookies
        res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
        res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);

        // Redirect to app
        res.redirect(stateData.returnUrl || '/');

    } catch (error) {
        console.error('[azureAuth] Callback error:', error);
        res.redirect(`/?error=auth_failed&message=${encodeURIComponent(error.message || 'Authentication failed')}`);
    }
});

/**
 * GET /api/auth/azure/status
 * Check if Azure SSO is configured (for frontend to show/hide button)
 */
router.get('/status', (req, res) => {
    res.json({
        configured: isAzureOidcConfigured(),
    });
});

export default router;
