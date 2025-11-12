import { attachReportRisks, updateReportRiskSnapshot } from "../services/reportRiskSnapshotService.js";

export const postReportRisks = async (req, res, next) => {
  try {
    const { reportId } = req.validatedParams ?? req.params ?? {};
    const { riskIds } = req.validatedBody ?? {};
    const { snapshots } = await attachReportRisks(reportId, riskIds, req.user);
    res.status(201).json({ success: true, snapshots });
  } catch (error) {
    next(error);
  }
};

export const patchReportRiskSnapshot = async (req, res, next) => {
  try {
    const { reportId, snapshotId } = req.validatedParams ?? req.params ?? {};
    const { probability, impact } = req.validatedBody ?? {};
    const snapshot = await updateReportRiskSnapshot(reportId, snapshotId, { probability, impact }, req.user);
    res.status(200).json({ success: true, snapshot });
  } catch (error) {
    next(error);
  }
};
