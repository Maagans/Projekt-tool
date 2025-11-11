import { Router } from "express";
import authRoutes from "./authRoutes.js";
import setupRoutes from "./setupRoutes.js";
import workspaceRoutes from "./workspaceRoutes.js";
import projectsRoutes from "./projectsRoutes.js";
import usersRoutes from "./usersRoutes.js";
import employeesRoutes from "./employeesRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";

export const createApiRouter = ({ resourcesEnabled } = {}) => {
  const router = Router();

  router.use("/", authRoutes);
  router.use("/setup", setupRoutes);
  router.use("/workspace", workspaceRoutes);
  router.use("/projects", projectsRoutes);
  router.use("/employees", employeesRoutes);
  router.use("/users", usersRoutes);

  if (resourcesEnabled) {
    router.use("/analytics", analyticsRoutes);
  }

  return router;
};

export default createApiRouter;
