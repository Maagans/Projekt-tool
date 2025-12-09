import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateForgotPassword, validateResetPassword } from "../validators/passwordResetValidators.js";
import { forgotPassword, resetPassword } from "../controllers/passwordResetController.js";
import { config } from "../config/index.js";

const router = Router();

// Stricter rate limiting for password reset endpoints
const passwordResetRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: 5, // max 5 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "For mange forsøg. Prøv igen om lidt.",
    },
});

router.post("/forgot-password", passwordResetRateLimiter, validateForgotPassword, forgotPassword);
router.post("/reset-password", passwordResetRateLimiter, validateResetPassword, resetPassword);

export default router;
