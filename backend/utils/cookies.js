import crypto from "crypto";
import { isProduction } from "../config/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const AUTH_COOKIE_NAME = "authToken";
export const CSRF_COOKIE_NAME = "csrfToken";

export const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: DAY_MS,
    path: "/",
};

export const csrfCookieOptions = {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    maxAge: DAY_MS,
    path: "/",
};

export const clearCookieOptions = (options) => ({
    ...options,
    maxAge: 0,
});

export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');
