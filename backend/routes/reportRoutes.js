import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import {
  validateAttachReportRisks,
  validateUpdateReportRiskSnapshot,
} from "../validators/reportRiskSnapshotValidators.js";
import { postReportRisks, patchReportRiskSnapshot } from "../controllers/reportRiskSnapshotController.js";

const router = Router();

router.post(
  "/reports/:reportId/risks",
  authMiddleware,
  requireCsrf,
  validateAttachReportRisks,
  postReportRisks,
);

router.patch(
  "/reports/:reportId/risks/:snapshotId",
  authMiddleware,
  requireCsrf,
  validateUpdateReportRiskSnapshot,
  patchReportRiskSnapshot,
);

export default router;
