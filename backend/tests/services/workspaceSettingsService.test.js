import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchWorkspaceSettings,
  updateWorkspaceSettingsEntry,
} from "../../services/workspaceSettingsService.js";
import pool from "../../db.js";
import { ensureEmployeeLinkForUser } from "../../services/workspaceService.js";

vi.mock("../../db.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock("../../services/workspaceService.js", async () => {
  const actual = await vi.importActual("../../services/workspaceService.js");
  return {
    ...actual,
    ensureEmployeeLinkForUser: vi.fn(),
  };
});

describe("workspaceSettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing settings when no payload is provided", async () => {
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "lead-1", role: "Projektleder" });
    pool.query.mockResolvedValueOnce({ rows: [{ baseline: 35 }] });

    const result = await updateWorkspaceSettingsEntry({}, { id: "lead-1", role: "Projektleder" });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ pmoBaselineHoursWeek: 35 });
  });

  it("updates baseline as administrator", async () => {
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });
    pool.query.mockResolvedValueOnce({}); // update query

    const result = await updateWorkspaceSettingsEntry(
      { pmoBaselineHoursWeek: 42.5 },
      { id: "admin-1", role: "Administrator" },
    );

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain("INSERT INTO workspace_settings");
    expect(result).toEqual({ pmoBaselineHoursWeek: 42.5 });
  });

  it("rejects team members", async () => {
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "user-1", role: "Teammedlem" });

    await expect(
      updateWorkspaceSettingsEntry({ pmoBaselineHoursWeek: 10 }, { id: "user-1", role: "Teammedlem" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("fetchWorkspaceSettings reads value from DB", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ baseline: 12 }] });
    const result = await fetchWorkspaceSettings();
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ pmoBaselineHoursWeek: 12 });
  });
});
