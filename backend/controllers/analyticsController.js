import pool from "../db.js";
import { config } from "../config/index.js";
import { aggregateResourceAnalytics } from "../services/resourceAnalyticsService.js";
import { createAppError } from "../utils/errors.js";

const buildCsv = ({ scope, series }, range) => {
  const header = ["scope_type", "scope_id", "from_week", "to_week", "week", "capacity", "planned", "actual"];
  const rows = [
    header,
    ...series.map((point) => [
      scope.type,
      scope.id,
      range.fromWeek,
      range.toWeek,
      point.week,
      point.capacity,
      point.planned,
      point.actual,
    ]),
  ];

  return rows.map((line) => line.join(",")).join("\n");
};

const ensureFeatureEnabled = () => {
  if (!config.features.resourcesAnalyticsEnabled) {
    throw createAppError("Resource analytics are not enabled.", 404);
  }
};

const assertDepartmentAccess = (user) => {
  if (user?.role !== "Administrator") {
    throw createAppError("Forbidden: Only administrators can view department analytics.", 403);
  }
};

const assertProjectAccess = async (user, projectId) => {
  if (user?.role === "Administrator") {
    return;
  }

  if (user?.role !== "Projektleder") {
    throw createAppError("Forbidden: Insufficient permissions for project analytics.", 403);
  }

  const employeeId = user.employeeId ?? null;
  if (!employeeId) {
    throw createAppError("Forbidden: Project analytics require an associated employee record.", 403);
  }

  const membershipResult = await pool.query(
    `
      SELECT is_project_lead
      FROM project_members
      WHERE project_id = $1::uuid AND employee_id = $2::uuid
      LIMIT 1
    `,
    [projectId, employeeId],
  );

  if (membershipResult.rowCount === 0 || membershipResult.rows[0].is_project_lead !== true) {
    throw createAppError("Forbidden: Only project leads can view project analytics.", 403);
  }
};

export const getResourceAnalytics = async (req, res, next) => {
  try {
    ensureFeatureEnabled();

    const { scope, scopeId, fromWeek, toWeek } = req.validatedQuery ?? {};
    const { format } = req.query ?? {};

    if (!scope || !scopeId || !fromWeek || !toWeek) {
      throw createAppError("Missing required analytics parameters.", 400);
    }

    if (!req.user) {
      throw createAppError("Authentication required.", 401);
    }

    if (scope === "department") {
      assertDepartmentAccess(req.user);
    } else if (scope === "project") {
      await assertProjectAccess(req.user, scopeId);
    } else {
      throw createAppError("Unsupported scope type.", 400);
    }

    const analytics = await aggregateResourceAnalytics({
      scope,
      scopeId,
      workspaceId: req.user.workspaceId,
      range: { fromWeek, toWeek },
    });

    if (typeof format === "string" && format.toLowerCase() === "csv") {
      const csvContent = buildCsv(analytics, { fromWeek, toWeek });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=resource-analytics-${scope}-${scopeId}-${fromWeek}-${toWeek}.csv`,
      );
      res.send(csvContent);
      return;
    }

    res.json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

export default {
  getResourceAnalytics,
};
