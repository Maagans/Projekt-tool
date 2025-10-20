import pool from "../db.js";
import { buildWorkspaceForUser, persistWorkspace, ensureEmployeeLinkForUser } from "../services/workspaceService.js";

export const getWorkspace = async (req, res, next) => {
    try {
        const workspace = await buildWorkspaceForUser(req.user);
        res.json(workspace);
    } catch (error) {
        next(error);
    }
};

export const saveWorkspace = async (req, res, next) => {
    if (req.user?.role === 'Teammedlem') {
        return res.status(403).json({ message: 'Forbidden: Team members cannot modify workspace data.' });
    }

    try {
        const workspaceData = req.validatedBody ?? req.body;
        const enrichedUser = await ensureEmployeeLinkForUser(pool, req.user);
        await persistWorkspace(workspaceData, enrichedUser);
        const workspace = await buildWorkspaceForUser(enrichedUser);
        res.json({ success: true, workspace });
    } catch (error) {
        next(error);
    }
};
