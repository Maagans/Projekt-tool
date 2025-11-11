import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";
import { PROJECT_RISK_CATEGORY_KEYS, PROJECT_RISK_STATUSES } from "../services/risk/riskSchema.js";

const uuidSchema = z.string().uuid({ message: "Value must be a valid UUID." });

const booleanQuerySchema = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined) return false;
    if (typeof value === "boolean") return value;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off", ""].includes(normalized)) return false;
    throw new Error("Invalid boolean value.");
  });

const statusSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => PROJECT_RISK_STATUSES.includes(value), {
    message: "Invalid risk status.",
  });

const categorySchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => PROJECT_RISK_CATEGORY_KEYS.includes(value), {
    message: "Invalid risk category.",
  });

const baseRiskFields = {
  title: z.string().trim().min(1, "title is required."),
  description: z.string().optional(),
  probability: z.coerce.number().min(1).max(5).optional(),
  impact: z.coerce.number().min(1).max(5).optional(),
  mitigationPlanA: z.string().optional(),
  mitigationPlanB: z.string().optional(),
  ownerId: uuidSchema.optional(),
  followUpNotes: z.string().optional(),
  followUpFrequency: z.string().optional(),
  category: categorySchema.optional(),
  lastFollowUpAt: z.string().datetime().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be formatted as YYYY-MM-DD.")
    .optional(),
  status: statusSchema.optional(),
};

const createRiskSchema = z.object({
  ...baseRiskFields,
  title: baseRiskFields.title,
});

const updateRiskSchema = z
  .object({
    ...baseRiskFields,
    title: baseRiskFields.title.optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one risk field must be provided.",
  });

const listQuerySchema = z.object({
  status: statusSchema.optional(),
  ownerId: uuidSchema.optional(),
  category: categorySchema.optional(),
  includeArchived: booleanQuerySchema,
  overdue: booleanQuerySchema,
});

const projectParamSchema = z.object({
  projectId: uuidSchema,
});

const riskParamSchema = z.object({
  riskId: uuidSchema,
});

export const validateRiskListRequest = (req, res, next) => {
  const paramsParsed = projectParamSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, "Invalid project identifier.", paramsParsed.error.issues);
  }
  const queryParsed = listQuerySchema.safeParse(req.query ?? {});
  if (!queryParsed.success) {
    return respondValidationError(res, "Invalid risk filters.", queryParsed.error.issues);
  }
  req.validatedParams = paramsParsed.data;
  req.validatedQuery = queryParsed.data;
  return next();
};

export const validateCreateRisk = (req, res, next) => {
  const paramsParsed = projectParamSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, "Invalid project identifier.", paramsParsed.error.issues);
  }
  const bodyParsed = createRiskSchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    return respondValidationError(res, "Invalid risk payload.", bodyParsed.error.issues);
  }
  req.validatedParams = paramsParsed.data;
  req.validatedBody = bodyParsed.data;
  return next();
};

export const validateUpdateRisk = (req, res, next) => {
  const paramsParsed = riskParamSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, "Invalid risk identifier.", paramsParsed.error.issues);
  }
  const bodyParsed = updateRiskSchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    return respondValidationError(res, "Invalid risk payload.", bodyParsed.error.issues);
  }
  req.validatedParams = paramsParsed.data;
  req.validatedBody = bodyParsed.data;
  return next();
};

export const validateArchiveRisk = (req, res, next) => {
  const paramsParsed = riskParamSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, "Invalid risk identifier.", paramsParsed.error.issues);
  }
  req.validatedParams = paramsParsed.data;
  return next();
};
