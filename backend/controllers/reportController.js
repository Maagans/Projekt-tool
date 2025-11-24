import * as reportService from "../services/reportService.js";

export const listProjectReports = async (req, res, next) => {
  try {
    const { projectId } = req.validatedParams ?? req.params ?? {};
    const reports = await reportService.listProjectReports(projectId, req.user);
    res.status(200).json({ success: true, reports });
  } catch (error) {
    next(error);
  }
};

export const getReport = async (req, res, next) => {
  try {
    const { reportId } = req.validatedParams ?? req.params ?? {};
    const report = await reportService.getReport(reportId, req.user);
    res.status(200).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

export const createReport = async (req, res, next) => {
  try {
    const { projectId } = req.validatedParams ?? req.params ?? {};
    const payload = req.validatedBody ?? req.body ?? {};
    const report = await reportService.createReport(projectId, payload, req.user);
    res.status(201).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

export const updateReport = async (req, res, next) => {
  try {
    const { reportId } = req.validatedParams ?? req.params ?? {};
    const payload = req.validatedBody ?? req.body ?? {};
    const report = await reportService.updateReport(reportId, payload, req.user);
    res.status(200).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

export const deleteReport = async (req, res, next) => {
  try {
    const { reportId } = req.validatedParams ?? req.params ?? {};
    await reportService.deleteReport(reportId, req.user);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
