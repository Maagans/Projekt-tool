import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import {
  validateAttachReportRisks,
  validateUpdateReportRiskSnapshot,
} from "../validators/reportRiskSnapshotValidators.js";
import {
  validateCreateReport,
  validateDeleteReport,
  validateGetReport,
  validateListProjectReports,
  validateUpdateReport,
} from "../validators/reportValidators.js";
import {
  postReportRisks,
  patchReportRiskSnapshot,
} from "../controllers/reportRiskSnapshotController.js";
import {
  listProjectReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
} from "../controllers/reportController.js";

const router = Router();

router.get(
  "/projects/:projectId/reports",
  authMiddleware,
  validateListProjectReports,
  listProjectReports,
);

router.get(
  "/reports/:reportId",
  authMiddleware,
  validateGetReport,
  getReport,
);

router.post(
  "/projects/:projectId/reports",
  authMiddleware,
  requireCsrf,
  validateCreateReport,
  createReport,
);

router.patch(
  "/reports/:reportId",
  authMiddleware,
  requireCsrf,
  validateUpdateReport,
  updateReport,
);

router.delete(
  "/reports/:reportId",
  authMiddleware,
  requireCsrf,
  validateDeleteReport,
  deleteReport,
);

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
