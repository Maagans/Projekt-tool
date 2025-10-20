
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import pool from './db.js';
import logger from './logger.js';
import apiRoutes from './routes/index.js';
import { createAppError } from './utils/errors.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const defaultCorsOrigins = process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173'];
const envCorsOrigins = String(process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = envCorsOrigins.length > 0 ? envCorsOrigins : defaultCorsOrigins;
const allowAllOrigins = allowedOrigins.length === 0;

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use('/api', apiRoutes);

app.get('/health', async (req, res, next) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok' });
    } catch (error) {
        logger.error({ err: error }, 'Health check failed');
        return next(createAppError('Health check failed', 503, error));
    }
});

// Centralized error handler
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const status = err.status ?? err.statusCode ?? 500;
    const message =
        err.userMessage ??
        (status < 500 && err.message ? err.message : 'An internal server error occurred.');

    if (status >= 500) {
        logger.error({ err }, 'Unhandled application error');
    }

    res.status(status).json({
        success: false,
        message,
    });
});

app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Backend server is running');
});












