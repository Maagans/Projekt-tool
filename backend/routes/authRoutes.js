import { Router } from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../authMiddleware.js";
import { validateLogin, validateRegister } from "../validators/authValidators.js";
import { login, register, logout } from "../controllers/authController.js";

const router = Router();

const rateWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const rateMax = Number(process.env.RATE_LIMIT_MAX ?? 5);
const authRateLimiter = rateLimit({
    windowMs: rateWindowMs,
    max: rateMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many attempts. Please try again shortly.',
    },
});

router.post('/login', authRateLimiter, validateLogin, login);
router.post('/register', authRateLimiter, validateRegister, register);
router.post('/logout', authMiddleware, logout);

export default router;
