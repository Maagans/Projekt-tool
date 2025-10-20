import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import { validateWorkspacePayload } from "../validators/workspaceValidators.js";
import { getWorkspace, saveWorkspace } from "../controllers/workspaceController.js";

const router = Router();

router.get('/', authMiddleware, getWorkspace);
router.post('/', authMiddleware, requireCsrf, validateWorkspacePayload, saveWorkspace);

export default router;
