import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";

export const forgotPasswordSchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .min(1, "Email is required.")
        .max(320, "Email must be at most 320 characters.")
        .email("Email must be valid.")
        .transform((v) => v.toLowerCase()),
});

export const resetPasswordSchema = z.object({
    token: z
        .string({ required_error: "Token is required." })
        .min(1, "Token is required."),
    password: z
        .string({ required_error: "Password is required." })
        .min(8, "Password must be at least 8 characters.")
        .max(256, "Password must be at most 256 characters."),
});

/**
 * Middleware: validate forgot password request body.
 */
export const validateForgotPassword = (req, res, next) => {
    const parsed = forgotPasswordSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return respondValidationError(res, "Invalid forgot password payload.", parsed.error.issues);
    }
    req.validatedBody = parsed.data;
    return next();
};

/**
 * Middleware: validate reset password request body.
 */
export const validateResetPassword = (req, res, next) => {
    const parsed = resetPasswordSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return respondValidationError(res, "Invalid reset password payload.", parsed.error.issues);
    }
    req.validatedBody = parsed.data;
    return next();
};
