import { describe, it, expect, vi } from "vitest";
import {
  calcDepartmentSeries,
  calcProjectSeries,
  aggregateResourceAnalytics,
} from "../../services/resourceAnalyticsService.js";
import {
  engineeringDepartmentEmployees,
  engineeringDepartmentEntries,
  alphaProjectMembers,
  alphaProjectEntriesExtended,
} from "../fixtures/resourceAnalyticsFixtures.js";

describe("resourceAnalyticsService", () => {
  it("aggregates department data with capacity baseline and over-allocation detection", async () => {
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries }),
    };

    const result = await calcDepartmentSeries("Engineering", {
      range: { fromWeek: "2025-W01", toWeek: "2025-W03" },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(2);
    expect(mockDb.query.mock.calls[0][1]).toEqual(["Engineering"]);
    expect(mockDb.query.mock.calls[1][1]).toEqual(["Engineering", "2025-W01", "2025-W03"]);

    expect(result.scope).toEqual({ type: "department", id: "Engineering" });
    expect(result.series).toEqual([
      { week: "2025-W01", capacity: 112.5, planned: 90, actual: 84 },
      { week: "2025-W02", capacity: 112.5, planned: 130, actual: 120 },
      { week: "2025-W03", capacity: 112.5, planned: 0, actual: 0 },
    ]);
    expect(result.overAllocatedWeeks).toEqual(["2025-W02"]);
  });

  it("aggregates project data across ISO week-year boundaries", async () => {
    const projectId = "5ac7b3f2-318e-40ff-9c3a-222222222222";
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: projectId }] })
        .mockResolvedValueOnce({ rows: alphaProjectMembers })
        .mockResolvedValueOnce({ rows: alphaProjectEntriesExtended }),
    };

    const result = await calcProjectSeries(projectId, {
      range: { fromWeek: "2025-W52", toWeek: "2026-W02" },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(3);
    expect(mockDb.query.mock.calls[0][1]).toEqual([projectId]);
    expect(mockDb.query.mock.calls[1][1]).toEqual([projectId]);
    expect(mockDb.query.mock.calls[2][1]).toEqual([projectId, "2025-W52", "2026-W02"]);

    expect(result.scope).toEqual({ type: "project", id: projectId });
    expect(result.series).toEqual([
      { week: "2025-W52", capacity: 70, planned: 60, actual: 58 },
      { week: "2026-W01", capacity: 70, planned: 80, actual: 92 },
      { week: "2026-W02", capacity: 70, planned: 40, actual: 36 },
    ]);
    expect(result.overAllocatedWeeks).toEqual(["2026-W01"]);
  });

  it("throws a 404 when project does not exist", async () => {
    const projectId = "5ac7b3f2-318e-40ff-9c3a-222222222999";
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] }),
    };

    await expect(
      calcProjectSeries(projectId, {
        range: { fromWeek: "2025-W01", toWeek: "2025-W02" },
        dbClient: mockDb,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects inverted ranges", async () => {
    await expect(
      calcDepartmentSeries("Engineering", {
        range: { fromWeek: "2025-W03", toWeek: "2025-W01" },
        dbClient: { query: vi.fn() },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("delegates to the correct scope via aggregateResourceAnalytics", async () => {
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries }),
    };

    const result = await aggregateResourceAnalytics({
      scope: "department",
      scopeId: "Engineering",
      range: { fromWeek: "2025-W01", toWeek: "2025-W02" },
      dbClient: mockDb,
    });

    expect(result.scope).toEqual({ type: "department", id: "Engineering" });
    expect(result.series).toEqual([
      { week: "2025-W01", capacity: 112.5, planned: 90, actual: 84 },
      { week: "2025-W02", capacity: 112.5, planned: 130, actual: 120 },
    ]);
  });

  it("rejects unsupported scope types", async () => {
    await expect(
      aggregateResourceAnalytics({
        scope: "team",
        scopeId: "Ops",
        range: { fromWeek: "2025-W01", toWeek: "2025-W02" },
        dbClient: { query: vi.fn() },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
