import { Router } from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import { validateLogin, validateRegister } from "../validators/authValidators.js";
import { login, register, logout, refreshSession } from "../controllers/authController.js";
import { config } from "../config/index.js";

const router = Router();

const rateWindowMs = config.rateLimit.windowMs;
const rateMax = config.rateLimit.max;
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
router.post('/logout', authMiddleware, requireCsrf, logout);
router.post('/refresh', authMiddleware, refreshSession);

export default router;

