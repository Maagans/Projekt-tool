import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import { validateWorkspacePayload, validateWorkspaceSettings } from "../validators/workspaceValidators.js";
import { getWorkspace, saveWorkspace, updateWorkspaceSettings } from "../controllers/workspaceController.js";

const router = Router();

router.get('/', authMiddleware, getWorkspace);
router.post('/', authMiddleware, requireCsrf, validateWorkspacePayload, saveWorkspace);
router.patch('/settings', authMiddleware, requireCsrf, validateWorkspaceSettings, updateWorkspaceSettings);

export default router;

