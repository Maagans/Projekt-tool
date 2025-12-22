/**
 * Azure AD Authentication Service
 * Implements OIDC flow for Microsoft SSO
 * 
 * Layer 2: Service - No direct SQL, orchestrates repository calls
 */

import { config } from '../config/index.js';
import * as userRepo from '../repositories/userRepository.js';
import * as workspacesRepo from '../repositories/workspacesRepository.js';
import pool from '../db.js';
import { createAppError } from '../utils/errors.js';
import { logAction } from './auditLogService.js';

// Azure AD OIDC endpoints
const AZURE_AUTHORITY = `https://login.microsoftonline.com/${config.azure.tenantId}`;
const AUTHORIZE_URL = `${AZURE_AUTHORITY}/oauth2/v2.0/authorize`;
const TOKEN_URL = `${AZURE_AUTHORITY}/oauth2/v2.0/token`;

/**
 * Validate that Azure OIDC is properly configured
 */
export const isAzureOidcConfigured = () => {
    return Boolean(
        config.azure.tenantId &&
        config.azure.clientId &&
        config.azure.clientSecret &&
        config.azure.oidcRedirectUri
    );
};

/**
 * Generate the Azure AD authorization URL for SSO redirect
 * @param {string} state - Random state for CSRF protection
 * @returns {string} Full authorization URL
 */
export const getAuthorizationUrl = (state) => {
    if (!isAzureOidcConfigured()) {
        throw createAppError('Azure SSO is not configured.', 500);
    }

    const params = new URLSearchParams({
        client_id: config.azure.clientId,
        response_type: 'code',
        redirect_uri: config.azure.oidcRedirectUri,
        response_mode: 'query',
        scope: 'openid profile email',
        state: state,
    });

    return `${AUTHORIZE_URL}?${params.toString()}`;
};

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Azure AD callback
 * @returns {Promise<{ idToken: string, accessToken: string }>}
 */
export const exchangeCodeForTokens = async (code) => {
    if (!isAzureOidcConfigured()) {
        throw createAppError('Azure SSO is not configured.', 500);
    }

    const body = new URLSearchParams({
        client_id: config.azure.clientId,
        client_secret: config.azure.clientSecret,
        code: code,
        redirect_uri: config.azure.oidcRedirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email',
    });

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[azureAuthService] Token exchange failed:', error);
        throw createAppError('Failed to authenticate with Microsoft.', 401);
    }

    const data = await response.json();
    return {
        idToken: data.id_token,
        accessToken: data.access_token,
    };
};

/**
 * Decode and validate Azure AD ID token (basic validation - not full JWT verify)
 * In production, you should use a proper JWT library with JWKS validation
 * @param {string} idToken - JWT ID token from Azure AD
 * @returns {{ oid: string, email: string, name: string }}
 */
export const decodeIdToken = (idToken) => {
    try {
        // Split JWT: header.payload.signature
        const parts = idToken.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }

        // Decode payload (base64url)
        const payload = JSON.parse(
            Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
        );

        // Extract required claims
        const oid = payload.oid; // Azure Object ID (unique identifier)
        const email = payload.email || payload.preferred_username || payload.upn;
        const name = payload.name || email?.split('@')[0] || 'Unknown';

        if (!oid) {
            throw new Error('Missing oid claim');
        }

        return { oid, email, name };
    } catch (error) {
        console.error('[azureAuthService] Token decode failed:', error.message);
        throw createAppError('Invalid authentication token.', 401);
    }
};

/**
 * Find or create user from Azure AD authentication
 * - If user exists with matching azure_oid → return existing user
 * - If user exists with matching email → link azure_oid and return
 * - Otherwise → create new user with default workspace
 * 
 * @param {{ oid: string, email: string, name: string }} azureUser
 * @param {string|null} ipAddress
 * @returns {Promise<object>} User record
 */
export const findOrCreateUser = async (azureUser, ipAddress = null) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Check if user exists by Azure OID
        let user = await userRepo.findByAzureOid(client, azureUser.oid);

        if (user) {
            await client.query('COMMIT');
            return user;
        }

        // 2. Check if user exists by email (link existing account)
        user = await userRepo.findByEmail(client, azureUser.email);

        if (user) {
            // Link Azure account to existing user
            await userRepo.updateAzureOid(client, user.id, azureUser.oid);

            await logAction(client, {
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                workspaceId: user.workspace_id,
                action: 'UPDATE',
                entityType: 'user',
                entityId: user.id,
                entityName: user.name,
                description: `Linkede Azure AD konto til eksisterende bruger`,
                ipAddress,
            });

            await client.query('COMMIT');

            // Re-fetch to get updated auth_provider
            return await userRepo.findByAzureOid(client, azureUser.oid);
        }

        // 3. Create new user with default workspace
        const defaultWorkspace = await workspacesRepo.getDefaultWorkspace(client);

        user = await userRepo.createFromAzure(client, {
            azureOid: azureUser.oid,
            email: azureUser.email,
            name: azureUser.name,
            workspaceId: defaultWorkspace?.id ?? null,
        });

        await logAction(client, {
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            workspaceId: user.workspace_id,
            action: 'CREATE',
            entityType: 'user',
            entityId: user.id,
            entityName: user.name,
            description: `Oprettede bruger via Azure AD SSO`,
            ipAddress,
        });

        await client.query('COMMIT');
        return user;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
