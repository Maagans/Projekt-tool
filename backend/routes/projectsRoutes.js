import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import { validateTimeEntryRequest } from "../validators/workspaceValidators.js";
import { updateTimeEntries } from "../controllers/projectsController.js";

const router = Router();

router.post('/:projectId/time-entries', authMiddleware, validateTimeEntryRequest, updateTimeEntries);

export default router;
