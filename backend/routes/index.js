import { Router } from "express";
import authRoutes from "./authRoutes.js";
import passwordResetRoutes from "./passwordResetRoutes.js";
import setupRoutes from "./setupRoutes.js";
import workspaceRoutes from "./workspaceRoutes.js";
import projectsRoutes from "./projectsRoutes.js";
import usersRoutes from "./usersRoutes.js";
import employeesRoutes from "./employeesRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";
import projectRiskRoutes from "./projectRiskRoutes.js";
import reportRoutes from "./reportRoutes.js";
import organizationsRoutes from "./organizationsRoutes.js";
import workspacesRoutes from "./workspacesRoutes.js";
import auditLogRoutes from "./auditLogRoutes.js";

export const createApiRouter = ({ resourcesEnabled, riskAnalysisEnabled } = {}) => {
  const router = Router();

  router.use("/", authRoutes);
  router.use("/", passwordResetRoutes);
  router.use("/setup", setupRoutes);
  router.use("/workspace", workspaceRoutes);
  router.use("/projects", projectsRoutes);
  if (riskAnalysisEnabled) {
    router.use("/", projectRiskRoutes);
    router.use("/", reportRoutes);
  }
  router.use("/employees", employeesRoutes);
  router.use("/users", usersRoutes);
  router.use("/organizations", organizationsRoutes);
  router.use("/workspaces", workspacesRoutes);
  router.use("/admin/audit-logs", auditLogRoutes);

  if (resourcesEnabled) {
    router.use("/analytics", analyticsRoutes);
  }

  return router;
};

export default createApiRouter;
