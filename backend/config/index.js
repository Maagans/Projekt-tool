import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (value === undefined) return undefined;
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
    throw new Error(`Invalid boolean value: ${value}`);
  })
  .optional();

const configSchema = z.object({
  ADMIN_NAME: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_FORCE_RESET: booleanSchema.default(true),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .default("postgresql://localhost:5432/projekt-tool"),
  JWT_SECRET: z
    .string()
    .min(1, "JWT_SECRET is required")
    .default("development-secret-change-me"),
  CORS_ORIGIN: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  LOG_LEVEL: z.string().default("info"),
  RESOURCES_ANALYTICS_ENABLED: booleanSchema.default(false),
  DEBUG_WORKSPACE: booleanSchema.default(false),
  PG_BACKUP_DIR: z.string().default("backups"),
});

const parsed = configSchema.parse(process.env);

const corsOrigins = parsed.CORS_ORIGIN
  ? parsed.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

export const config = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  databaseUrl: parsed.DATABASE_URL,
  jwtSecret: parsed.JWT_SECRET,
  logLevel: parsed.LOG_LEVEL,
  corsOrigins,
  rateLimit: {
    windowMs: parsed.RATE_LIMIT_WINDOW_MS,
    max: parsed.RATE_LIMIT_MAX,
  },
  features: {
    resourcesAnalyticsEnabled: parsed.RESOURCES_ANALYTICS_ENABLED ?? false,
  },
  debug: {
    workspace: parsed.DEBUG_WORKSPACE ?? false,
  },
  directories: {
    backup: parsed.PG_BACKUP_DIR,
  },
  adminSeed: {
    name: parsed.ADMIN_NAME ?? null,
    email: parsed.ADMIN_EMAIL ?? null,
    password: parsed.ADMIN_PASSWORD ?? null,
    forceReset: parsed.ADMIN_FORCE_RESET ?? true,
  },
};

export const isProduction = config.nodeEnv === "production";
