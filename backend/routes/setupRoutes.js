import { Router } from "express";
import { getSetupStatus, createFirstUser } from "../controllers/setupController.js";

const router = Router();

router.get('/status', getSetupStatus);
router.post('/create-first-user', createFirstUser);

export default router;
