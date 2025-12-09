import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import logger from "../logger.js";
import { config } from "../config/index.js";
import { createAppError } from "../utils/errors.js";
import { withTransaction } from "../utils/transactions.js";
import * as passwordResetRepo from "../repositories/passwordResetRepository.js";
import * as usersRepo from "../repositories/usersRepository.js";
import { sendPasswordResetEmail } from "../utils/graphMailClient.js";

const TOKEN_BYTES = 32;

/**
 * Generate a cryptographically secure token.
 */
const generateToken = () => crypto.randomBytes(TOKEN_BYTES).toString("hex");

/**
 * Hash a token for storage.
 */
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * Request a password reset for an email address.
 * Always returns success for security (don't reveal if email exists).
 * @param {string} email
 */
export const requestPasswordReset = async (email) => {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await usersRepo.findByEmail(pool, normalizedEmail);

    // Security: always return success to prevent email enumeration
    if (!user) {
        logger.info({ event: "password_reset_request", email: normalizedEmail, found: false });
        return { success: true };
    }

    // Azure AD users cannot reset password here
    if (user.auth_provider === "azure_ad") {
        logger.info({ event: "password_reset_request", email: normalizedEmail, azure_ad: true });
        return {
            success: true,
            isAzureAdUser: true,
            message: "Brug Microsoft til at nulstille dit password.",
        };
    }

    // Generate token
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + config.passwordReset.tokenExpiryMinutes * 60 * 1000);

    // Store token in database
    await passwordResetRepo.createToken(pool, {
        userId: user.id,
        tokenHash,
        expiresAt,
    });

    // Build reset link
    const resetLink = `${config.passwordReset.frontendUrl}/reset-password?token=${rawToken}`;

    // Send email
    await sendPasswordResetEmail(user.email, user.name, resetLink);

    logger.info({ event: "password_reset_request", email: normalizedEmail, sent: true });
    return { success: true };
};

/**
 * Reset password using a token.
 * @param {string} token - The raw token from the reset link
 * @param {string} newPassword - The new password
 */
export const resetPassword = async (token, newPassword) => {
    const tokenHash = hashToken(token);

    return withTransaction(async (client) => {
        // Find valid token
        const tokenRecord = await passwordResetRepo.findValidToken(client, tokenHash);

        if (!tokenRecord) {
            logger.warn({ event: "password_reset_failed", reason: "invalid_or_expired_token" });
            throw createAppError("Ugyldigt eller udløbet token. Anmod om et nyt reset-link.", 400);
        }

        // Ensure user is local (not Azure AD)
        if (tokenRecord.auth_provider !== "local") {
            logger.warn({ event: "password_reset_failed", reason: "azure_ad_user", userId: tokenRecord.user_id });
            throw createAppError("Azure AD brugere kan ikke nulstille password her.", 400);
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        const updated = await usersRepo.updatePasswordHash(client, tokenRecord.user_id, passwordHash);
        if (!updated) {
            throw createAppError("Kunne ikke opdatere password.", 500);
        }

        // Mark token as used
        await passwordResetRepo.markTokenUsed(client, tokenRecord.id);

        // Invalidate all other tokens for this user
        await passwordResetRepo.invalidateUserTokens(client, tokenRecord.user_id);

        logger.info({ event: "password_reset_success", userId: tokenRecord.user_id });
        return { success: true, message: "Dit password er blevet nulstillet." };
    });
};

/**
 * Cleanup expired tokens (can be run periodically).
 */
export const cleanupExpiredTokens = async () => {
    const count = await passwordResetRepo.deleteExpiredTokens(pool);
    logger.info({ event: "password_reset_cleanup", deleted: count });
    return count;
};
