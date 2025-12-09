import * as passwordResetService from "../services/passwordResetService.js";

/**
 * Handle forgot password request.
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.validatedBody;
        const result = await passwordResetService.requestPasswordReset(email);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Handle password reset with token.
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.validatedBody;
        const result = await passwordResetService.resetPassword(token, password);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
