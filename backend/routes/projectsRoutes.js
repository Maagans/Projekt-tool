import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import { validateTimeEntryRequest } from "../validators/workspaceValidators.js";
import { updateTimeEntries } from "../controllers/projectsController.js";

const router = Router();

router.post('/:projectId/time-entries', authMiddleware, requireCsrf, validateTimeEntryRequest, updateTimeEntries);

export default router;
