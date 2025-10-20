import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import { getUsers, changeUserRole } from "../controllers/usersController.js";

const router = Router();

router.get('/', authMiddleware, getUsers);
router.put('/:id/role', authMiddleware, requireCsrf, changeUserRole);

export default router;
