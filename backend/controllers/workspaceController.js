import { mutateWorkspace } from "../services/workspaceMutator.js";
import { buildWorkspaceForUser } from "../services/workspaceService.js";

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
        const { workspace } = await mutateWorkspace(req.user, (draft) => {
            draft.settings = {
                ...(draft.settings ?? {}),
                ...settings,
            };
        });

        res.json({ success: true, settings: workspace.settings });
    } catch (error) {
        next(error);
    }
};
