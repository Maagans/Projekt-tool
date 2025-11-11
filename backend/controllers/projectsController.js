import { mutateWorkspace } from '../services/workspaceMutator.js';
import { updateProjectTimeEntries } from "../services/projectsService.js";

const sanitizeProjectForPersist = (project) => {
    const clone = JSON.parse(JSON.stringify(project));
    delete clone.permissions;
    return clone;
};

const ensureProjectsCollection = (draft) => {
    if (!Array.isArray(draft.projects)) {
        draft.projects = [];
    }
    return draft.projects;
};

const findProjectOrThrow = (draft, projectId) => {
    const projects = ensureProjectsCollection(draft);
    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project) {
        const error = new Error('Project not found.');
        error.statusCode = 404;
        throw error;
    }
    if (!Array.isArray(project.projectMembers)) {
        project.projectMembers = [];
    }
    return project;
};

const ensureEmployeeExists = (draft, employeeId) => {
    const employees = Array.isArray(draft.employees) ? draft.employees : [];
    const exists = employees.some((employee) => employee.id === employeeId);
    if (!exists) {
        const error = new Error('Employee not found.');
        error.statusCode = 404;
        throw error;
    }
};

export const createProject = async (req, res, next) => {
    try {
        const payload = req.validatedBody ?? req.body ?? {};
        const { workspace, result: createdId } = await mutateWorkspace(req.user, (draft, _current, helpers) => {
            if (!Array.isArray(draft.projects)) {
                draft.projects = [];
            }
            const projectId = payload.id ?? helpers.randomUUID();
            if (draft.projects.some((existing) => existing.id === projectId)) {
                const error = new Error('Project already exists.');
                error.statusCode = 409;
                throw error;
            }

            const newProject = {
                id: projectId,
                config: {
                    projectName: payload?.config?.projectName?.trim() || 'Nyt projekt',
                    projectStartDate: payload?.config?.projectStartDate,
                    projectEndDate: payload?.config?.projectEndDate ?? payload?.config?.projectStartDate,
                },
                status: payload.status ?? 'active',
                description: payload.description ?? '',
                projectMembers: Array.isArray(payload.projectMembers) ? payload.projectMembers : [],
                reports: Array.isArray(payload.reports) ? payload.reports : [],
            };
            draft.projects.push(sanitizeProjectForPersist(newProject));
            return projectId;
        });

        const project = workspace.projects.find((candidate) => candidate.id === createdId) ?? null;
        res.status(201).json({ success: true, project });
    } catch (error) {
        next(error);
    }
};

export const updateProject = async (req, res, next) => {
    try {
        const { projectId } = req.validatedParams ?? req.params ?? {};
        const updatedProject = req.validatedBody?.project ?? req.body ?? {};
        const sanitizedProject = sanitizeProjectForPersist({
            ...updatedProject,
            id: projectId,
        });

        const { workspace } = await mutateWorkspace(req.user, (draft) => {
            if (!Array.isArray(draft.projects)) {
                draft.projects = [];
            }
            const index = draft.projects.findIndex((project) => project.id === projectId);
            if (index === -1) {
                const error = new Error('Project not found.');
                error.statusCode = 404;
                throw error;
            }
            draft.projects[index] = {
                ...draft.projects[index],
                ...sanitizedProject,
            };
        });

        const project = workspace.projects.find((candidate) => candidate.id === projectId) ?? null;
        res.json({ success: true, project });
    } catch (error) {
        next(error);
    }
};

export const deleteProject = async (req, res, next) => {
    try {
        const { projectId } = req.validatedParams ?? req.params ?? {};
        await mutateWorkspace(req.user, (draft) => {
            const projects = ensureProjectsCollection(draft);
            const initialLength = projects.length;
            draft.projects = projects.filter((project) => project.id !== projectId);
            if (draft.projects.length === initialLength) {
                const error = new Error('Project not found.');
                error.statusCode = 404;
                throw error;
            }
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const updateTimeEntries = async (req, res, next) => {
    try {
        const params = req.validatedParams ?? req.params ?? {};
        const body = req.validatedBody ?? req.body ?? {};
        const result = await updateProjectTimeEntries({ ...params, ...body }, req.user);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const addProjectMember = async (req, res, next) => {
    try {
        const { projectId } = req.validatedParams ?? req.params ?? {};
        const payload = req.validatedBody ?? {};

        const { workspace, result: createdMemberId } = await mutateWorkspace(req.user, (draft, _current, helpers) => {
            const project = findProjectOrThrow(draft, projectId);
            ensureEmployeeExists(draft, payload.employeeId);

            if (project.projectMembers.some((member) => member.employeeId === payload.employeeId)) {
                const error = new Error('Employee is already assigned to this project.');
                error.statusCode = 409;
                throw error;
            }

            const memberId = payload.id ?? helpers.randomUUID();
            const newMember = {
                id: memberId,
                employeeId: payload.employeeId,
                role: payload.role?.trim() || 'Ny rolle',
                group: payload.group ?? 'unassigned',
                isProjectLead: false,
                timeEntries: [],
            };
            project.projectMembers.push(newMember);
            return memberId;
        });

        const project = workspace.projects.find((candidate) => candidate.id === projectId);
        const member = project?.projectMembers.find((candidate) => candidate.id === createdMemberId) ?? null;
        res.status(201).json({ success: true, member });
    } catch (error) {
        next(error);
    }
};

export const updateProjectMember = async (req, res, next) => {
    try {
        const { projectId, memberId } = req.validatedParams ?? req.params ?? {};
        const updates = req.validatedBody ?? {};

        const { workspace } = await mutateWorkspace(req.user, (draft) => {
            const project = findProjectOrThrow(draft, projectId);
            const member = project.projectMembers.find((candidate) => candidate.id === memberId);
            if (!member) {
                const error = new Error('Project member not found.');
                error.statusCode = 404;
                throw error;
            }

            if (updates.role !== undefined) {
                member.role = updates.role.trim();
            }
            if (updates.group !== undefined) {
                member.group = updates.group;
            }
            if (updates.isProjectLead !== undefined) {
                member.isProjectLead = Boolean(updates.isProjectLead);
            }
        });

        const project = workspace.projects.find((candidate) => candidate.id === projectId);
        const member = project?.projectMembers.find((candidate) => candidate.id === memberId) ?? null;
        res.json({ success: true, member });
    } catch (error) {
        next(error);
    }
};

export const deleteProjectMember = async (req, res, next) => {
    try {
        const { projectId, memberId } = req.validatedParams ?? req.params ?? {};

        await mutateWorkspace(req.user, (draft) => {
            const project = findProjectOrThrow(draft, projectId);
            const initialLength = project.projectMembers.length;
            project.projectMembers = project.projectMembers.filter((member) => member.id !== memberId);
            if (project.projectMembers.length === initialLength) {
                const error = new Error('Project member not found.');
                error.statusCode = 404;
                throw error;
            }
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
