import { createProjectRecord, updateProjectRecord, deleteProjectRecord } from '../services/projects/projectService.js';
import { updateProjectTimeEntries } from "../services/projects/timeEntriesService.js";
import {
    addProjectMemberRecord,
    updateProjectMemberRecord,
    deleteProjectMemberRecord,
} from '../services/projects/projectMembersService.js';
import { buildWorkspaceForUser } from '../services/workspaceService.js';

export const createProject = async (req, res, next) => {
    try {
        const payload = req.validatedBody ?? req.body ?? {};
        const projectId = await createProjectRecord(payload, req.user);
        const project = await loadProjectForResponse(req.user, projectId);
        res.status(201).json({ success: true, project });
    } catch (error) {
        next(error);
    }
};

export const updateProject = async (req, res, next) => {
    try {
        const { projectId } = req.validatedParams ?? req.params ?? {};
        const updatedProject = req.validatedBody?.project ?? req.body ?? {};
        await updateProjectRecord(projectId, updatedProject, req.user);
        const project = await loadProjectForResponse(req.user, projectId);
        res.json({ success: true, project });
    } catch (error) {
        next(error);
    }
};

export const deleteProject = async (req, res, next) => {
    try {
        const { projectId } = req.validatedParams ?? req.params ?? {};
        const result = await deleteProjectRecord(projectId, req.user);
        res.json(result);
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

        const member = await addProjectMemberRecord(projectId, payload, req.user);
        res.status(201).json({ success: true, member });
    } catch (error) {
        next(error);
    }
};

export const updateProjectMember = async (req, res, next) => {
    try {
        const { projectId, memberId } = req.validatedParams ?? req.params ?? {};
        const updates = req.validatedBody ?? {};

        const member = await updateProjectMemberRecord(projectId, memberId, updates, req.user);
        res.json({ success: true, member });
    } catch (error) {
        next(error);
    }
};

export const deleteProjectMember = async (req, res, next) => {
    try {
        const { projectId, memberId } = req.validatedParams ?? req.params ?? {};

        const result = await deleteProjectMemberRecord(projectId, memberId, req.user);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const loadProjectForResponse = async (user, projectId) => {
    const workspace = await buildWorkspaceForUser(user);
    const project = workspace.projects.find((candidate) => candidate.id === projectId);
    if (!project) {
        return { id: projectId };
    }
    return project;
};
