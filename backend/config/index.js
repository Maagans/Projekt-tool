import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
    throw new Error(`Invalid boolean value: ${value}`);
  })
  .optional();

const trustProxySchema = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "number") {
      return Number.isNaN(value) ? false : value;
    }
    if (typeof value === "boolean") {
      return value ? "loopback" : false;
    }
    const trimmed = value.trim();
    if (!trimmed) return false;
    const normalized = trimmed.toLowerCase();
    if (["false", "0", "off", "no"].includes(normalized)) {
      return false;
    }
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
    if (["true", "yes", "on", "loopback"].includes(normalized)) {
      return "loopback";
    }
    return trimmed;
  })
  .default(false);

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
  PROJECT_RISK_ANALYSIS_ENABLED: booleanSchema.default(true),
  DEBUG_WORKSPACE: booleanSchema.default(false),
  TRUST_PROXY: trustProxySchema,
  PG_BACKUP_DIR: z.string().default("backups"),
  // Azure / Microsoft Graph
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  AZURE_MAIL_FROM: z.string().email().optional(),
  AZURE_OIDC_REDIRECT_URI: z.string().url().optional(),
  // Password Reset
  PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: z.coerce.number().int().positive().default(60),
  FRONTEND_URL: z.string().optional(),
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
  trustProxy: parsed.TRUST_PROXY,
  corsOrigins,
  rateLimit: {
    windowMs: parsed.RATE_LIMIT_WINDOW_MS,
    max: parsed.RATE_LIMIT_MAX,
  },
  features: {
    resourcesAnalyticsEnabled: parsed.RESOURCES_ANALYTICS_ENABLED ?? false,
    projectRiskAnalysisEnabled: parsed.PROJECT_RISK_ANALYSIS_ENABLED ?? true,
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
  azure: {
    tenantId: parsed.AZURE_TENANT_ID ?? null,
    clientId: parsed.AZURE_CLIENT_ID ?? null,
    clientSecret: parsed.AZURE_CLIENT_SECRET ?? null,
    mailFrom: parsed.AZURE_MAIL_FROM ?? null,
    oidcRedirectUri: parsed.AZURE_OIDC_REDIRECT_URI ?? null,
  },
  passwordReset: {
    tokenExpiryMinutes: parsed.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
    frontendUrl: parsed.FRONTEND_URL ?? "http://localhost:5173",
  },
};

export const isProduction = config.nodeEnv === "production";
