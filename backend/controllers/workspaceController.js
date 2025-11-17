import { buildWorkspaceForUser } from "../services/workspaceService.js";
import { updateWorkspaceSettingsEntry } from "../services/workspaceSettingsService.js";

export const getWorkspace = async (req, res, next) => {
    try {
        const workspace = await buildWorkspaceForUser(req.user);
        res.json(workspace);
    } catch (error) {
        next(error);
    }
};

export const updateWorkspaceSettings = async (req, res, next) => {
    try {
        const settings = req.validatedBody ?? {};
        const updated = await updateWorkspaceSettingsEntry(settings, req.user);
        res.json({ success: true, settings: updated });
    } catch (error) {
        next(error);
    }
};
