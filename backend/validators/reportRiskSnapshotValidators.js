import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";
import { classifyReportIdentifier, isValidUuid } from "../utils/helpers.js";

const reportParamSchema = z.object({
  reportId: z
    .string()
    .min(1, "reportId is required.")
    .refine((value) => {
      try {
        classifyReportIdentifier(value);
        return true;
      } catch {
        return false;
      }
    }, "reportId must be a valid numeric or UUID identifier."),
});

const attachBodySchema = z.object({
  riskIds: z
    .array(z.string().refine(isValidUuid, "Each riskId must be a valid UUID."))
    .max(50, "You can attach at most 50 risici ad gangen.")
    .optional()
    .default([]),
});

export const validateAttachReportRisks = (req, res, next) => {
  const paramsParsed = reportParamSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, "Invalid report identifier.", paramsParsed.error.issues);
  }
  const bodyParsed = attachBodySchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    return respondValidationError(res, "Invalid body payload.", bodyParsed.error.issues);
  }
  req.validatedParams = paramsParsed.data;
  req.validatedBody = bodyParsed.data;
  return next();
};

const snapshotParamSchema = reportParamSchema.extend({
  snapshotId: z.string().refine(isValidUuid, "snapshotId must be a valid UUID."),
});

const updateSnapshotBodySchema = z.object({
  probability: z.coerce.number().min(1).max(5),
  impact: z.coerce.number().min(1).max(5),
});

export const validateUpdateReportRiskSnapshot = (req, res, next) => {
  const paramsParsed = snapshotParamSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, "Invalid snapshot identifier.", paramsParsed.error.issues);
  }
  const bodyParsed = updateSnapshotBodySchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    return respondValidationError(res, "Invalid body payload.", bodyParsed.error.issues);
  }
  req.validatedParams = paramsParsed.data;
  req.validatedBody = bodyParsed.data;
  return next();
};
