import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pool from './db.js';
import logger from './logger.js';
import createApiRouter from './routes/index.js';
import { createAppError } from './utils/errors.js';
import { config } from './config/index.js';

const resolveFeatureFlag = (override, fallback) => {
  if (typeof override === 'boolean') {
    return override;
  }
  return fallback;
};

export const createApp = ({ dbClient, resourcesAnalyticsEnabled, riskAnalysisEnabled } = {}) => {
  const app = express();
  if (config.trustProxy !== false) {
    app.set('trust proxy', config.trustProxy);
  }
  const database = dbClient ?? pool;
  const resourcesEnabled = resolveFeatureFlag(
    resourcesAnalyticsEnabled,
    config.features.resourcesAnalyticsEnabled,
  );
  const riskEnabled = resolveFeatureFlag(
    riskAnalysisEnabled,
    config.features.projectRiskAnalysisEnabled,
  );

  const defaultCorsOrigins =
    config.corsOrigins.length > 0
      ? config.corsOrigins
      : config.nodeEnv === 'production'
        ? []
        : ['http://localhost:5173'];
  const allowedOrigins = defaultCorsOrigins;
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
  const apiRouter = createApiRouter({ resourcesEnabled, riskAnalysisEnabled: riskEnabled });
  app.use('/api', apiRouter);

  app.get('/health', async (req, res, next) => {
    try {
      await database.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch (error) {
      logger.error({ err: error }, 'Health check failed');
      return next(createAppError('Health check failed', 503, error));
    }
  });

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

  return app;
};

export default createApp;
