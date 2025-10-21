import jwt from "jsonwebtoken";
import { AUTH_COOKIE_NAME } from "./utils/cookies.js";
import { config } from "./config/index.js";

const authMiddleware = (req, res, next) => {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ message: 'Authentication failed: Token is missing.' });
    }

    if (!config.jwtSecret) {
        return res.status(500).json({ message: 'Server configuration error: JWT secret is missing.' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Authentication failed: Token is invalid or has expired.' });
    }
};

export default authMiddleware;
