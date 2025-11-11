import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";

const isoWeekPattern = /^\d{4}-W\d{2}$/;

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

export const timeEntryParamsSchema = z.object({
    projectId: z.string({ required_error: "projectId is required." }).uuid('projectId must be a valid UUID.'),
});

export const timeEntryBodySchema = z
    .object({
        memberId: z.string({ required_error: "memberId is required." }).uuid('memberId must be a valid UUID.'),
        weekKey: z
            .string({ required_error: "weekKey is required." })
            .trim()
            .regex(isoWeekPattern, 'weekKey must be in the format YYYY-Www.'),
        plannedHours: optionalNonNegativeNumber('plannedHours'),
        actualHours: optionalNonNegativeNumber('actualHours'),
    })
    .refine(
        (data) => data.plannedHours !== undefined || data.actualHours !== undefined,
        {
            message: 'plannedHours or actualHours must be provided.',
            path: ['plannedHours'],
        },
    );

export const validateTimeEntryRequest = (req, res, next) => {
    const paramsParsed = timeEntryParamsSchema.safeParse(req.params ?? {});
    if (!paramsParsed.success) {
        return respondValidationError(res, "Invalid time entry parameters.", paramsParsed.error.issues);
    }

    const bodyParsed = timeEntryBodySchema.safeParse(req.body ?? {});
    if (!bodyParsed.success) {
        return respondValidationError(res, "Invalid time entry payload.", bodyParsed.error.issues);
    }

    req.validatedParams = paramsParsed.data;
    req.validatedBody = bodyParsed.data;
    return next();
};

export const validateWorkspaceSettings = (req, res, next) => {
    const parsed = workspaceSettingsUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return respondValidationError(res, 'Invalid workspace settings payload.', parsed.error.issues);
    }
    req.validatedBody = parsed.data;
    return next();
};
