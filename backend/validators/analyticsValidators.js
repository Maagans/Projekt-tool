import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";

const isoWeekPattern = /^\d{4}-W\d{2}$/;

const isoWeekField = (fieldName) =>
  z
    .string({ required_error: `${fieldName} is required.` })
    .trim()
    .regex(isoWeekPattern, `${fieldName} must be in the format YYYY-Www.`);

const departmentQuerySchema = z.object({
  scope: z.literal("department"),
  scopeId: z
    .string({ required_error: "scopeId is required for department scope." })
    .trim()
    .min(1, "scopeId must be provided."),
  fromWeek: isoWeekField("fromWeek"),
  toWeek: isoWeekField("toWeek"),
});

const projectQuerySchema = z.object({
  scope: z.literal("project"),
  scopeId: z
    .string({ required_error: "scopeId is required for project scope." })
    .trim()
    .uuid("scopeId must be a valid UUID for project scope."),
  fromWeek: isoWeekField("fromWeek"),
  toWeek: isoWeekField("toWeek"),
});

const analyticsQuerySchema = z
  .union([departmentQuerySchema, projectQuerySchema])
  .refine(
    (data) => data.fromWeek.localeCompare(data.toWeek) <= 0,
    {
      message: "fromWeek cannot be after toWeek.",
      path: ["fromWeek"],
    },
  );

export const validateAnalyticsQuery = (req, res, next) => {
  const parsed = analyticsQuerySchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    return respondValidationError(
      res,
      "Invalid analytics query parameters.",
      parsed.error.issues,
    );
  }

  req.validatedQuery = parsed.data;
  return next();
};

export default {
  validateAnalyticsQuery,
};
