import pool from "../db.js";
import { createAppError } from "../utils/errors.js";
import { toNonNegativeCapacity } from "../utils/helpers.js";
import { ensureEmployeeLinkForUser, WORKSPACE_SETTINGS_SINGLETON_ID } from "./workspaceService.js";

const assertCanManageSettings = (user) => {
  if (!user) {
    throw createAppError("Unauthorized", 401);
  }
  if (user.role !== "Administrator" && user.role !== "Projektleder") {
    throw createAppError("Forbidden: Insufficient permissions.", 403);
  }
};

export const fetchWorkspaceSettings = async (client = pool) => {
  const result = await client.query(
    `
      SELECT COALESCE(pmo_baseline_hours_week, 0)::float AS baseline
      FROM workspace_settings
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [WORKSPACE_SETTINGS_SINGLETON_ID],
  );
  return {
    pmoBaselineHoursWeek: Number(result.rows?.[0]?.baseline ?? 0),
  };
};

export const updateWorkspaceSettingsEntry = async (settings = {}, user) => {
  const effectiveUser = await ensureEmployeeLinkForUser(pool, user);
  assertCanManageSettings(effectiveUser);

  if (!Object.prototype.hasOwnProperty.call(settings, "pmoBaselineHoursWeek")) {
    return fetchWorkspaceSettings();
  }

  const baselineValue = toNonNegativeCapacity(settings.pmoBaselineHoursWeek ?? 0);
  await pool.query(
    `
      INSERT INTO workspace_settings (id, pmo_baseline_hours_week, updated_at, updated_by)
      VALUES ($1::uuid, $2::numeric, NOW(), $3::uuid)
      ON CONFLICT (id)
      DO UPDATE
        SET pmo_baseline_hours_week = EXCLUDED.pmo_baseline_hours_week,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
    `,
    [WORKSPACE_SETTINGS_SINGLETON_ID, baselineValue, effectiveUser?.id ?? null],
  );

  return { pmoBaselineHoursWeek: baselineValue };
};
