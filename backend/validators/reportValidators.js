import { z } from "zod";
import { respondValidationError } from "../utils/errors.js";

const weekKeySchema = z
  .string()
  .regex(/^\d{4}-W\d{1,2}$/, "weekKey must follow pattern YYYY-Wxx (e.g., 2024-W05).");

const listItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  position: z.number().int().nonnegative().optional(),
});

const mainTableRowSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().nonnegative().optional(),
  title: z.string().min(1),
  status: z.enum(["green", "yellow", "red"]),
  note: z.string().optional().nullable(),
});

const phaseSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  start: z.number().min(0).max(100),
  end: z.number().min(0).max(100),
  highlight: z.string().optional().nullable(),
  workstreamId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

const milestoneSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  position: z.number().min(0).max(100),
  date: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  workstreamId: z.string().uuid().optional().nullable(),
});

const deliverableChecklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  completed: z.boolean().optional().default(false),
});

const deliverableSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  position: z.number().min(0).max(100),
  milestoneId: z.string().min(1).optional().nullable(),
  status: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional().nullable(),
  checklist: z.array(deliverableChecklistItemSchema).optional().default([]),
});

const kanbanTaskSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  status: z.enum(["todo", "doing", "done"]),
  assignee: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdAt: z.string().optional().default(() => new Date().toISOString()),
});

const projectStateSchema = z.object({
  statusItems: z.array(listItemSchema).optional().default([]),
  challengeItems: z.array(listItemSchema).optional().default([]),
  nextStepItems: z.array(listItemSchema).optional().default([]),
  mainTableRows: z.array(mainTableRowSchema).optional().default([]),
  risks: z.array(z.any()).optional().default([]), // risk snapshots håndteres særskilt
  phases: z.array(phaseSchema).optional().default([]),
  milestones: z.array(milestoneSchema).optional().default([]),
  deliverables: z.array(deliverableSchema).optional().default([]),
  kanbanTasks: z.array(kanbanTaskSchema).optional().default([]),
  workstreams: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        order: z.number().int().nonnegative(),
      }),
    )
    .optional()
    .default([]),
});

const projectParamsSchema = z.object({
  projectId: z.string().min(1, "projectId is required."),
});

const reportParamsSchema = z.object({
  reportId: z.string().min(1, "reportId is required."),
});

const createReportBodySchema = z.object({
  weekKey: weekKeySchema,
  state: projectStateSchema.optional().default({}),
});

const updateReportBodySchema = z.object({
  weekKey: weekKeySchema.optional(),
  state: projectStateSchema.optional(),
});

const safeParse = (schema, payload) => schema.safeParse(payload ?? {});

const handleParse = (res, parsed, message) => {
  if (!parsed.success) {
    respondValidationError(res, message, parsed.error.issues);
    return null;
  }
  return parsed.data;
};

export const validateListProjectReports = (req, res, next) => {
  const parsed = safeParse(projectParamsSchema, req.params);
  const params = handleParse(res, parsed, "Invalid project identifier.");
  if (!params) return;
  req.validatedParams = params;
  return next();
};

export const validateGetReport = (req, res, next) => {
  const parsed = safeParse(reportParamsSchema, req.params);
  const params = handleParse(res, parsed, "Invalid report identifier.");
  if (!params) return;
  req.validatedParams = params;
  return next();
};

export const validateCreateReport = (req, res, next) => {
  const paramsParsed = safeParse(projectParamsSchema, req.params);
  const bodyParsed = safeParse(createReportBodySchema, req.body);
  const params = handleParse(res, paramsParsed, "Invalid project identifier.");
  if (!params) return;
  const body = handleParse(res, bodyParsed, "Invalid report payload.");
  if (!body) return;
  req.validatedParams = params;
  req.validatedBody = body;
  return next();
};

export const validateUpdateReport = (req, res, next) => {
  const paramsParsed = safeParse(reportParamsSchema, req.params);
  const bodyParsed = safeParse(updateReportBodySchema, req.body);
  const params = handleParse(res, paramsParsed, "Invalid report identifier.");
  if (!params) return;
  const body = handleParse(res, bodyParsed, "Invalid report payload.");
  if (!body) return;
  req.validatedParams = params;
  req.validatedBody = body;
  return next();
};

export const validateDeleteReport = validateGetReport;
