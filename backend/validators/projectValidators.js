import { z } from 'zod';
import { respondValidationError } from '../utils/errors.js';
import { PROJECT_STATUS } from '../constants/projectStatus.js';

const statusOptions = Object.values(PROJECT_STATUS);
const projectMemberGroupOptions = ['styregruppe', 'projektgruppe', 'partnere', 'referencegruppe', 'unassigned'];
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dateStringSchema = z
  .string()
  .trim()
  .refine((value) => isoDateRegex.test(value), { message: 'Date must be formatted as YYYY-MM-DD.' });

const budgetValueSchema = z
  .preprocess((value) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      const normalized = value.replace(',', '.').trim();
      if (normalized.length === 0) {
        return null;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  }, z.number({ invalid_type_error: 'totalBudget must be a number.' }).nonnegative('totalBudget must be non-negative.').nullable())
  .optional();

const workstreamInputSchema = z
  .array(
    z.object({
      id: z.string().uuid('workstream id must be a valid UUID.').optional(),
      name: z.string().trim().min(1, 'workstream name is required.'),
      order: z.number().int().nonnegative().optional(),
    }),
  )
  .optional()
  .transform((streams) => {
    if (!streams) {
      return undefined;
    }
    const normalized = streams
      .map((stream, index) => ({
        ...stream,
        name: stream.name.trim(),
        order: typeof stream.order === 'number' ? stream.order : index,
      }))
      .sort((a, b) => a.order - b.order)
      .map((stream, index) => ({ ...stream, order: index }));
    return normalized;
  });

export const createProjectInputSchema = z.object({
  id: z.string().uuid('project id must be a valid UUID.').optional(),
  config: z.object({
    projectName: z.string().trim().min(1, 'projectName is required.'),
    projectStartDate: dateStringSchema,
    projectEndDate: dateStringSchema,
    projectGoal: z.string().optional().nullable(),
    businessCase: z.string().optional().nullable(),
    totalBudget: budgetValueSchema,
    heroImageUrl: z.string().trim().url('heroImageUrl must be a valid URL.').optional().nullable(),
  }),
  status: z.enum(statusOptions, { invalid_type_error: 'status must be valid.' }).optional(),
  description: z.string().optional(),
  projectMembers: z.array(z.any()).optional(),
  reports: z.array(z.any()).optional(),
  workstreams: workstreamInputSchema,
});

export const updateProjectInputSchema = z.object({
  config: createProjectInputSchema.shape.config.partial().optional(),
  status: z.enum(statusOptions, { invalid_type_error: 'status must be valid.' }).optional(),
  description: z.string().optional(),
  projectMembers: z.array(z.any()).optional(),
  reports: z.array(z.any()).optional(),
  workstreams: workstreamInputSchema,
});

const projectConfigSchema = z
  .object({
    projectName: z.string().trim().min(1, 'projectName is required.'),
    projectStartDate: z.string().trim().min(1, 'projectStartDate is required.'),
    projectEndDate: z.string().trim().min(1, 'projectEndDate is required.'),
    projectGoal: z.string().optional().nullable(),
    businessCase: z.string().optional().nullable(),
    totalBudget: budgetValueSchema,
    heroImageUrl: z.string().url('heroImageUrl must be a valid URL.').optional().nullable(),
  })
  .passthrough();

const projectSchema = z
  .object({
    id: z.string().uuid('project id must be a valid UUID.'),
    config: projectConfigSchema,
    status: z.enum(statusOptions, { invalid_type_error: 'status must be valid.' }).optional(),
    description: z.string().optional(),
    projectMembers: z.array(z.any()).optional(),
    reports: z.array(z.any()).optional(),
    workstreams: z.array(
      z.object({
        id: z.string().uuid('workstream id must be a valid UUID.').optional(),
        name: z.string().trim().min(1, 'workstream name is required.'),
        order: z.number().int().nonnegative().optional(),
      }),
    ).optional(),
  })
  .passthrough();

const createProjectSchema = projectSchema.extend({
  id: projectSchema.shape.id.optional(),
});

const projectUpdateSchema = z
  .object({
    config: projectConfigSchema.partial().optional(),
    status: z.enum(statusOptions, { invalid_type_error: 'status must be valid.' }).optional(),
    description: z.string().optional(),
    projectMembers: z.array(z.any()).optional(),
    reports: z.array(z.any()).optional(),
    workstreams: projectSchema.shape.workstreams.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one project field must be provided.',
  });

const projectIdentifierSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID.'),
});

const projectMemberIdentifierSchema = projectIdentifierSchema.extend({
  memberId: z.string().uuid('memberId must be a valid UUID.'),
});

const projectMemberCreateSchema = z.object({
  employeeId: z.string().uuid('employeeId must be a valid UUID.'),
  role: z.string().trim().min(1, 'role is required').optional(),
  group: z.enum(projectMemberGroupOptions).optional(),
  id: z.string().uuid('id must be a valid UUID.').optional(),
});

const projectMemberUpdateSchema = z
  .object({
    role: z.string().trim().min(1, 'role is required').optional(),
    group: z.enum(projectMemberGroupOptions).optional(),
    isProjectLead: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

export const validateCreateProject = (req, res, next) => {
  const parsed = createProjectSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return respondValidationError(res, 'Invalid project payload.', parsed.error.issues);
  }
  req.validatedBody = parsed.data;
  return next();
};

export const validateUpdateProject = (req, res, next) => {
  const paramsParsed = projectIdentifierSchema.safeParse(req.params ?? {});

  if (!paramsParsed.success) {
    return respondValidationError(res, 'Invalid project identifier.', paramsParsed.error.issues);
  }

  const bodyParsed = projectUpdateSchema.safeParse(req.body?.project ?? req.body ?? {});
  if (!bodyParsed.success) {
    return respondValidationError(res, 'Invalid project payload.', bodyParsed.error.issues);
  }

  req.validatedParams = paramsParsed.data;
  req.validatedBody = { project: bodyParsed.data };
  return next();
};

export const validateDeleteProject = (req, res, next) => {
  const parsed = projectIdentifierSchema.safeParse(req.params ?? {});

  if (!parsed.success) {
    return respondValidationError(res, 'Invalid project identifier.', parsed.error.issues);
  }

  req.validatedParams = parsed.data;
  return next();
};

export const validateAddProjectMember = (req, res, next) => {
  const paramsParsed = projectIdentifierSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, 'Invalid project identifier.', paramsParsed.error.issues);
  }

  const bodyParsed = projectMemberCreateSchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    return respondValidationError(res, 'Invalid project member payload.', bodyParsed.error.issues);
  }

  req.validatedParams = paramsParsed.data;
  req.validatedBody = bodyParsed.data;
  return next();
};

export const validateUpdateProjectMember = (req, res, next) => {
  const paramsParsed = projectMemberIdentifierSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, 'Invalid project/member identifier.', paramsParsed.error.issues);
  }

  const bodyParsed = projectMemberUpdateSchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    return respondValidationError(res, 'Invalid project member payload.', bodyParsed.error.issues);
  }

  req.validatedParams = paramsParsed.data;
  req.validatedBody = bodyParsed.data;
  return next();
};

export const validateProjectMemberIdentifier = (req, res, next) => {
  const paramsParsed = projectMemberIdentifierSchema.safeParse(req.params ?? {});
  if (!paramsParsed.success) {
    return respondValidationError(res, 'Invalid project/member identifier.', paramsParsed.error.issues);
  }

  req.validatedParams = paramsParsed.data;
  return next();
};
