import {
  listProjectRisks,
  createProjectRisk,
  updateProjectRisk,
  archiveProjectRisk,
} from "../services/risk/riskService.js";

export const getProjectRisks = async (req, res, next) => {
  try {
    const { projectId } = req.validatedParams ?? req.params ?? {};
    const filters = req.validatedQuery ?? {};
    const risks = await listProjectRisks(projectId, filters, req.user);
    res.json({ success: true, risks });
  } catch (error) {
    next(error);
  }
};

export const postProjectRisk = async (req, res, next) => {
  try {
    const { projectId } = req.validatedParams ?? req.params ?? {};
    const body = req.validatedBody ?? {};
    const risk = await createProjectRisk(projectId, body, req.user);
    res.status(201).json({ success: true, risk });
  } catch (error) {
    next(error);
  }
};

export const patchProjectRisk = async (req, res, next) => {
  try {
    const { riskId } = req.validatedParams ?? req.params ?? {};
    const updates = req.validatedBody ?? {};
    const risk = await updateProjectRisk(riskId, updates, req.user);
    res.json({ success: true, risk });
  } catch (error) {
    next(error);
  }
};

export const deleteProjectRisk = async (req, res, next) => {
  try {
    const { riskId } = req.validatedParams ?? req.params ?? {};
    const result = await archiveProjectRisk(riskId, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
