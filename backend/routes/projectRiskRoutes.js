import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import {
  validateArchiveRisk,
  validateCreateRisk,
  validateRiskListRequest,
  validateUpdateRisk,
} from "../validators/riskValidators.js";
import {
  deleteProjectRisk,
  getProjectRisks,
  patchProjectRisk,
  postProjectRisk,
} from "../controllers/projectRiskController.js";

const router = Router();

router.get("/projects/:projectId/risks", authMiddleware, validateRiskListRequest, getProjectRisks);
router.post(
  "/projects/:projectId/risks",
  authMiddleware,
  requireCsrf,
  validateCreateRisk,
  postProjectRisk,
);
router.patch("/risks/:riskId", authMiddleware, requireCsrf, validateUpdateRisk, patchProjectRisk);
router.delete("/risks/:riskId", authMiddleware, requireCsrf, validateArchiveRisk, deleteProjectRisk);

export default router;
