import { Router } from "express";
import authRoutes from "./authRoutes.js";
import setupRoutes from "./setupRoutes.js";
import workspaceRoutes from "./workspaceRoutes.js";
import projectsRoutes from "./projectsRoutes.js";
import usersRoutes from "./usersRoutes.js";

const router = Router();

router.use('/', authRoutes);
router.use('/auth', authRoutes); // optional alias for future endpoints
router.use('/setup', setupRoutes);
router.use('/workspace', workspaceRoutes);
router.use('/projects', projectsRoutes);
router.use('/users', usersRoutes);

export default router;
