import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import { getUsers, changeUserRole } from "../controllers/usersController.js";

const router = Router();

router.get('/', authMiddleware, getUsers);
router.put('/:id/role', authMiddleware, changeUserRole);

export default router;
