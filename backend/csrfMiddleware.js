import { CSRF_COOKIE_NAME } from "./utils/cookies.js";

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const requireCsrf = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        return res.status(403).json({ message: 'Invalid or missing CSRF token.' });
    }

    return next();
};

export default requireCsrf;
