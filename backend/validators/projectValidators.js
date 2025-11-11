import { z } from 'zod';
import { respondValidationError } from '../utils/errors.js';

const statusOptions = ['active', 'completed', 'on-hold'];
const projectMemberGroupOptions = ['styregruppe', 'projektgruppe', 'partnere', 'referencegruppe', 'unassigned'];

const projectConfigSchema = z
  .object({
    projectName: z.string().trim().min(1, 'projectName is required.'),
    projectStartDate: z.string().trim().min(1, 'projectStartDate is required.'),
    projectEndDate: z.string().trim().min(1, 'projectEndDate is required.'),
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
