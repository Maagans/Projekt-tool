import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";

const optionalNonNegativeNumber = (fieldName) =>
    z
        .preprocess(
            (value) => {
                if (value === undefined || value === null || value === '') return undefined;
                if (typeof value === 'number') return value;
                if (typeof value === 'string') {
                    const parsed = Number(value);
                    return Number.isNaN(parsed) ? value : parsed;
                }
                return value;
            },
            z
                .number({ invalid_type_error: `${fieldName} must be a number.` })
                .finite(`${fieldName} must be a finite number.`)
                .min(0, `${fieldName} cannot be negative.`),
        )
        .optional();

const workspaceSettingsSchema = z.object({
  pmoBaselineHoursWeek: optionalNonNegativeNumber("pmoBaselineHoursWeek"),
});

const workspaceSettingsUpdateSchema = workspaceSettingsSchema.partial();

export const validateWorkspaceSettings = (req, res, next) => {
    const parsed = workspaceSettingsUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return respondValidationError(res, 'Invalid workspace settings payload.', parsed.error.issues);
    }
    req.validatedBody = parsed.data;
    return next();
};
