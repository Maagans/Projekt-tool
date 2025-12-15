import { randomUUID } from "crypto";
import { withTransaction } from "../../utils/transactions.js";
import { createAppError } from "../../utils/errors.js";
import { toDateOnly } from "../../utils/helpers.js";
import { ensureEmployeeLinkForUser } from "../workspaceService.js";
import { syncProjectReports, syncProjectWorkstreams } from "./projectSyncService.js";
import * as projectRepository from "../../repositories/projectRepository.js";
import { createProjectInputSchema, updateProjectInputSchema } from "../../validators/projectValidators.js";
import { USER_ROLES } from "../../constants/roles.js";
import { PROJECT_STATUS } from "../../constants/projectStatus.js";
import { logAction } from "../auditLogService.js";

const toIsoDateString = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return toDateOnly(parsed);
    }
    return toDateOnly(new Date());
  }
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    return toDateOnly(new Date());
  }
  return toDateOnly(date);
};

const buildCreateInput = (payload = {}) => {
  const today = toDateOnly(new Date()) ?? new Date().toISOString().split("T")[0];
  const config = payload.config ?? {};
  const fallbackEndDate = config.projectEndDate ?? config.projectStartDate ?? today;
  return {
    ...payload,
    config: {
      projectName: typeof config.projectName === "string" ? config.projectName : "Nyt projekt",
      projectStartDate: typeof config.projectStartDate === "string" ? config.projectStartDate : today,
      projectEndDate: typeof fallbackEndDate === "string" ? fallbackEndDate : today,
      projectGoal: typeof config.projectGoal === "string" ? config.projectGoal : "",
      businessCase: typeof config.businessCase === "string" ? config.businessCase : "",
      totalBudget: config.totalBudget ?? null,
      heroImageUrl: typeof config.heroImageUrl === "string" ? config.heroImageUrl : config.heroImageUrl ?? null,
    },
    status: payload.status ?? PROJECT_STATUS.ACTIVE,
    description: payload.description ?? "",
  };
};

const parseCreateProjectInput = (payload) => {
  const parsed = createProjectInputSchema.safeParse(buildCreateInput(payload));
  if (!parsed.success) {
    throw createAppError("Invalid project payload.", 400, parsed.error);
  }
  return parsed.data;
};

const parseUpdateProjectInput = (payload) => {
  const parsed = updateProjectInputSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    throw createAppError("Invalid project payload.", 400, parsed.error);
  }
  return parsed.data;
};

const normalizeWorkstreams = (streams) => {
  if (!Array.isArray(streams)) {
    return undefined;
  }
  return streams.map((stream, index) => ({
    ...stream,
    id: stream.id ?? randomUUID(),
    order: typeof stream.order === "number" ? stream.order : index,
  }));
};

const toNullableRichTextValue = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
};

const assertCanManageProjects = async (client, user) => {
  const effectiveUser = await ensureEmployeeLinkForUser(client, user);
  if (!effectiveUser) {
    throw createAppError("Unauthorized", 401);
  }
  const role = effectiveUser.role;
  if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.PROJECT_LEADER) {
    throw createAppError("Forbidden: Insufficient permissions.", 403);
  }
  return effectiveUser;
};

const checkProjectLead = (client, projectId, employeeId) =>
  projectRepository.isProjectLead(client, projectId, employeeId);

export const createProjectRecord = async (payload, user) =>
  withTransaction(async (client) => {
    const effectiveUser = await assertCanManageProjects(client, user);
    const parsedInput = parseCreateProjectInput(payload);
    const data = {
      id: parsedInput.id ?? randomUUID(),
      config: {
        projectName: parsedInput.config.projectName,
        projectStartDate: parsedInput.config.projectStartDate,
        projectEndDate: parsedInput.config.projectEndDate,
        projectGoal: parsedInput.config.projectGoal ?? "",
        businessCase: parsedInput.config.businessCase ?? "",
        totalBudget: parsedInput.config.totalBudget ?? null,
        heroImageUrl: parsedInput.config.heroImageUrl ?? null,
      },
      status: parsedInput.status ?? "active",
      description: parsedInput.description ?? "",
      workstreams: normalizeWorkstreams(parsedInput.workstreams),
    };
    const goalValue = toNullableRichTextValue(data.config.projectGoal);
    const businessCaseValue = toNullableRichTextValue(data.config.businessCase);
    const totalBudgetValue =
      typeof data.config.totalBudget === "number" && Number.isFinite(data.config.totalBudget)
        ? Math.max(0, Math.round(data.config.totalBudget * 100) / 100)
        : null;
    const heroImageUrl =
      typeof data.config.heroImageUrl === "string" ? data.config.heroImageUrl.trim() || null : null;

    const exists = await projectRepository.existsById(client, data.id);
    if (exists) {
      throw createAppError("Project already exists.", 409);
    }

    const createdProject = await projectRepository.create(client, {
      id: data.id,
      name: data.config.projectName,
      startDate: data.config.projectStartDate,
      endDate: data.config.projectEndDate,
      status: data.status,
      description: (data.description ?? "").trim(),
      projectGoal: goalValue,
      businessCase: businessCaseValue,
      totalBudget: totalBudgetValue,
      heroImageUrl,
    });

    if (createdProject?.id && effectiveUser.role === USER_ROLES.PROJECT_LEADER && effectiveUser.employeeId) {
      await projectRepository.addProjectLeadMember(client, {
        id: randomUUID(),
        projectId: createdProject.id,
        employeeId: effectiveUser.employeeId,
      });
    }

    if (createdProject?.id && Array.isArray(data.workstreams)) {
      await syncProjectWorkstreams(client, createdProject.id, data.workstreams);
    }

    if (createdProject?.id && Array.isArray(payload.reports) && payload.reports.length > 0) {
      await syncProjectReports(client, createdProject.id, payload.reports);
    }

    // Log project creation
    await logAction(client, {
      userId: effectiveUser.id,
      userName: effectiveUser.name,
      userRole: effectiveUser.role,
      workspaceId: effectiveUser.workspaceId,
      action: 'CREATE',
      entityType: 'project',
      entityId: data.id,
      entityName: data.config.projectName,
      description: `Oprettede projekt '${data.config.projectName}'`,
      ipAddress: null
    });

    return createdProject?.id;
  });

export const updateProjectRecord = async (projectId, projectPayload, user) =>
  withTransaction(async (client) => {
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    if (!effectiveUser) {
      throw createAppError("Unauthorized", 401);
    }
    if (effectiveUser.role === USER_ROLES.PROJECT_LEADER) {
      if (!effectiveUser.employeeId || !(await checkProjectLead(client, projectId, effectiveUser.employeeId))) {
        throw createAppError("Forbidden: Insufficient permissions.", 403);
      }
    } else if (effectiveUser.role !== USER_ROLES.ADMIN) {
      throw createAppError("Forbidden: Insufficient permissions.", 403);
    }

    const currentRow = await projectRepository.findByIdForUpdate(client, projectId);
    if (!currentRow) {
      throw createAppError("Project not found.", 404);
    }

    const parsedInput = parseUpdateProjectInput(projectPayload);
    const config = {
      projectName: parsedInput.config?.projectName ?? currentRow.name ?? "Nyt projekt",
      projectStartDate: parsedInput.config?.projectStartDate ?? toIsoDateString(currentRow.start_date),
      projectEndDate: parsedInput.config?.projectEndDate ?? toIsoDateString(currentRow.end_date),
      projectGoal: parsedInput.config?.projectGoal ?? currentRow.project_goal ?? "",
      businessCase: parsedInput.config?.businessCase ?? currentRow.business_case ?? "",
      totalBudget:
        parsedInput.config?.totalBudget ??
        (currentRow.total_budget !== null ? Number(currentRow.total_budget) : null),
      heroImageUrl: parsedInput.config?.heroImageUrl ?? currentRow.hero_image_url ?? null,
    };
    const status = parsedInput.status ?? currentRow.status ?? PROJECT_STATUS.ACTIVE;
    const description = parsedInput.description ?? currentRow.description ?? "";
    const normalizedWorkstreams = normalizeWorkstreams(parsedInput.workstreams);
    const shouldUpdateWorkstreams = Array.isArray(projectPayload.workstreams);

    const goalValue = toNullableRichTextValue(config.projectGoal);
    const businessCaseValue = toNullableRichTextValue(config.businessCase);
    const totalBudgetValue =
      typeof config.totalBudget === "number" && Number.isFinite(config.totalBudget)
        ? Math.max(0, Math.round(config.totalBudget * 100) / 100)
        : null;
    const heroImageUrl =
      typeof config.heroImageUrl === "string" ? config.heroImageUrl.trim() || null : null;
    const updated = await projectRepository.update(client, {
      projectId,
      name: config.projectName,
      startDate: config.projectStartDate,
      endDate: config.projectEndDate,
      status,
      description: description.trim(),
      projectGoal: goalValue,
      businessCase: businessCaseValue,
      totalBudget: totalBudgetValue,
      heroImageUrl,
    });

    if (!updated) {
      throw createAppError("Project not found.", 404);
    }

    if (shouldUpdateWorkstreams) {
      await syncProjectWorkstreams(client, projectId, normalizedWorkstreams ?? []);
    }

    if (Array.isArray(projectPayload.reports) && projectPayload.reports.length > 0) {
      await syncProjectReports(client, projectId, projectPayload.reports);
    }

    // Log project update
    await logAction(client, {
      userId: effectiveUser.id,
      userName: effectiveUser.name,
      userRole: effectiveUser.role,
      workspaceId: effectiveUser.workspaceId,
      action: 'UPDATE',
      entityType: 'project',
      entityId: projectId,
      entityName: config.projectName,
      description: `Opdaterede projekt '${config.projectName}'`,
      ipAddress: null
    });

    return projectId;
  });

export const deleteProjectRecord = async (projectId, user) =>
  withTransaction(async (client) => {
    const effectiveUser = await ensureEmployeeLinkForUser(client, user);
    if (!effectiveUser) {
      throw createAppError("Unauthorized", 401);
    }
    if (effectiveUser.role === "Projektleder") {
      if (!effectiveUser.employeeId || !(await checkProjectLead(client, projectId, effectiveUser.employeeId))) {
        throw createAppError("Forbidden: Insufficient permissions.", 403);
      }
    } else if (effectiveUser.role !== "Administrator") {
      throw createAppError("Forbidden: Insufficient permissions.", 403);
    }

    const projectData = await projectRepository.findByIdForUpdate(client, projectId);
    if (!projectData) {
      throw createAppError("Project not found.", 404);
    }

    const deleted = await projectRepository.deleteById(client, projectId);
    if (!deleted) {
      throw createAppError("Project not found.", 404);
    }

    // Log project deletion
    await logAction(client, {
      userId: effectiveUser.id,
      userName: effectiveUser.name,
      userRole: effectiveUser.role,
      workspaceId: effectiveUser.workspaceId,
      action: 'DELETE',
      entityType: 'project',
      entityId: projectId,
      entityName: projectData.name,
      description: `Slettede projekt '${projectData.name}'`,
      ipAddress: null
    });

    return { success: true };
  });

