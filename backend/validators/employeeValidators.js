import { z } from 'zod';
import { respondValidationError } from '../utils/errors.js';

const numericCapacity = z.preprocess(
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
    .number({
      invalid_type_error: 'maxCapacityHoursWeek must be a number.',
    })
    .finite('maxCapacityHoursWeek must be finite.')
    .min(0, 'maxCapacityHoursWeek cannot be negative.'),
);

const baseEmployeeSchema = z.object({
  id: z.string().uuid('id must be a valid UUID.').optional(),
  name: z.string().trim().min(1, 'name is required.'),
  email: z.string().trim().email('email must be valid.'),
  location: z.string().trim().optional(),
  department: z.string().trim().optional(),
  maxCapacityHoursWeek: numericCapacity.optional().default(0),
});

// For updates we allow partial + extra read-only fields from frontend
const updateEmployeeSchema = baseEmployeeSchema.partial().extend({
  maxCapacityHoursWeek: baseEmployeeSchema.shape.maxCapacityHoursWeek.optional(),
  // Read-only fields that frontend may send but we ignore
  azureAdId: z.string().nullish(),
  jobTitle: z.string().nullish(),
  accountEnabled: z.boolean().nullish(),
  syncedAt: z.string().nullish(),
});

export const validateCreateEmployee = (req, res, next) => {
  const parsed = baseEmployeeSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return respondValidationError(res, 'Invalid employee payload.', parsed.error.issues);
  }
  req.validatedBody = parsed.data;
  return next();
};

export const validateUpdateEmployee = (req, res, next) => {
  const parsedParams = z
    .object({
      employeeId: z.string().uuid('employeeId must be a valid UUID.'),
    })
    .safeParse(req.params ?? {});

  if (!parsedParams.success) {
    return respondValidationError(res, 'Invalid employee identifier.', parsedParams.error.issues);
  }

  const parsedBody = updateEmployeeSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    return respondValidationError(res, 'Invalid employee payload.', parsedBody.error.issues);
  }

  req.validatedParams = parsedParams.data;
  req.validatedBody = parsedBody.data;
  return next();
};

export const validateEmployeeIdentifier = (req, res, next) => {
  const parsed = z
    .object({
      employeeId: z.string().uuid('employeeId must be a valid UUID.'),
    })
    .safeParse(req.params ?? {});

  if (!parsed.success) {
    return respondValidationError(res, 'Invalid employee identifier.', parsed.error.issues);
  }

  req.validatedParams = parsed.data;
  return next();
};
