import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";

const emailSchema = z
    .string({ required_error: "Email is required." })
    .trim()
    .min(1, "Email is required.")
    .max(320, "Email must be at most 320 characters.")
    .email("Email must be valid.")
    .transform((value) => value.toLowerCase());

const passwordSchema = z
    .string({ required_error: "Password is required." })
    .min(1, "Password is required.")
    .max(256, "Password must be at most 256 characters.");

export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

export const registerSchema = z.object({
    email: emailSchema,
    name: z
        .string({ required_error: "Name is required." })
        .trim()
        .min(2, "Name must be at least 2 characters.")
        .max(200, "Name must be at most 200 characters.")
        .transform((value) => value.trim()),
    password: z
        .string({ required_error: "Password is required." })
        .min(8, "Password must be at least 8 characters long.")
        .max(256, "Password must be at most 256 characters."),
});

export const validateLogin = (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return respondValidationError(res, "Invalid login payload.", parsed.error.issues);
    }
    req.validatedBody = parsed.data;
    return next();
};

export const validateRegister = (req, res, next) => {
    const parsed = registerSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return respondValidationError(res, "Invalid registration payload.", parsed.error.issues);
    }
    req.validatedBody = parsed.data;
    return next();
};
