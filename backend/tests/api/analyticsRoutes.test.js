import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL = "postgresql://localhost:5432/test";
process.env.RESOURCES_ANALYTICS_ENABLED = "true";

vi.mock("../../db.js", () => {
  const query = vi.fn();
  return {
    default: { query },
  };
});

vi.mock("../../services/resourceAnalyticsService.js", () => {
  const aggregateResourceAnalytics = vi.fn();
  return {
    aggregateResourceAnalytics,
    calcDepartmentSeries: vi.fn(),
    calcProjectSeries: vi.fn(),
    default: {
      aggregateResourceAnalytics,
      calcDepartmentSeries: vi.fn(),
      calcProjectSeries: vi.fn(),
    },
  };
});

import pool from "../../db.js";
import { aggregateResourceAnalytics } from "../../services/resourceAnalyticsService.js";
import { config } from "../../config/index.js";
import { createApp } from "../../app.js";
import { AUTH_COOKIE_NAME } from "../../utils/cookies.js";

config.features.resourcesAnalyticsEnabled = true;

const buildAuthCookie = (payload) => {
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "1h" });
  return `${AUTH_COOKIE_NAME}=${token}`;
};

const app = createApp({ resourcesAnalyticsEnabled: true });

describe("GET /api/analytics/resources", () => {
  beforeEach(() => {
    pool.query.mockReset();
    aggregateResourceAnalytics.mockReset();
  });

  it("returns analytics data for administrators querying department scope", async () => {
    aggregateResourceAnalytics.mockResolvedValue({
      scope: { type: "department", id: "Engineering" },
      series: [],
      overAllocatedWeeks: [],
    });

    const response = await request(app)
      .get("/api/analytics/resources")
      .query({
        scope: "department",
        scopeId: "Engineering",
        fromWeek: "2025-W01",
        toWeek: "2025-W02",
      })
      .set("Cookie", [buildAuthCookie({ id: "user-1", role: "Administrator" })]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.scope).toEqual({ type: "department", id: "Engineering" });
    expect(aggregateResourceAnalytics).toHaveBeenCalledWith({
      scope: "department",
      scopeId: "Engineering",
      range: { fromWeek: "2025-W01", toWeek: "2025-W02" },
    });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("allows project leads to fetch project analytics", async () => {
    aggregateResourceAnalytics.mockResolvedValue({
      scope: { type: "project", id: "5ac7b3f2-318e-40ff-9c3a-222222222222" },
      series: [],
      overAllocatedWeeks: [],
    });
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ is_project_lead: true }] });

    const response = await request(app)
      .get("/api/analytics/resources")
      .query({
        scope: "project",
        scopeId: "5ac7b3f2-318e-40ff-9c3a-222222222222",
        fromWeek: "2025-W01",
        toWeek: "2025-W02",
      })
      .set(
        "Cookie",
        [
          buildAuthCookie({
            id: "user-2",
            role: "Projektleder",
            employeeId: "b54d8b63-02c1-4bf5-9c17-111111111111",
          }),
        ],
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT is_project_lead"),
      ["5ac7b3f2-318e-40ff-9c3a-222222222222", "b54d8b63-02c1-4bf5-9c17-111111111111"],
    );
  });

  it("rejects project analytics for non-lead project members", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ is_project_lead: false }] });

    const response = await request(app)
      .get("/api/analytics/resources")
      .query({
        scope: "project",
        scopeId: "5ac7b3f2-318e-40ff-9c3a-222222222222",
        fromWeek: "2025-W01",
        toWeek: "2025-W02",
      })
      .set(
        "Cookie",
        [
          buildAuthCookie({
            id: "user-3",
            role: "Projektleder",
            employeeId: "b54d8b63-02c1-4bf5-9c17-222222222222",
          }),
        ],
      );

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(aggregateResourceAnalytics).not.toHaveBeenCalled();
  });

  it("validates query parameters before reaching the controller", async () => {
    const response = await request(app)
      .get("/api/analytics/resources")
      .query({
        scope: "department",
        scopeId: "",
        fromWeek: "invalid-week",
        toWeek: "2025-W01",
      })
      .set("Cookie", [buildAuthCookie({ id: "user-4", role: "Administrator" })]);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(aggregateResourceAnalytics).not.toHaveBeenCalled();
  });
});
