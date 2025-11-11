import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import { validateWorkspaceSettings } from "../validators/workspaceValidators.js";
import { getWorkspace, updateWorkspaceSettings } from "../controllers/workspaceController.js";

const router = Router();

router.get("/", authMiddleware, getWorkspace);
router.patch(
  "/settings",
  authMiddleware,
  requireCsrf,
  validateWorkspaceSettings,
  updateWorkspaceSettings,
);

export default router;

