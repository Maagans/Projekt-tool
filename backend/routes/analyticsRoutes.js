import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import { validateAnalyticsQuery } from "../validators/analyticsValidators.js";
import { getResourceAnalytics } from "../controllers/analyticsController.js";

const router = Router();

router.get("/resources", authMiddleware, validateAnalyticsQuery, getResourceAnalytics);

export default router;
