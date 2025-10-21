import { Router } from "express";
import { getSetupStatus, createFirstUser } from "../controllers/setupController.js";
import { validateInitialAdminPayload } from "../validators/setupValidators.js";

const router = Router();

router.get('/status', getSetupStatus);
router.post('/create-first-user', validateInitialAdminPayload, createFirstUser);

export default router;
