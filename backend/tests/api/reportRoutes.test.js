// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import createApp from "../../app.js";
import { config } from "../../config/index.js";
import {
  listProjectReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
} from "../../services/reportService.js";

vi.mock("../../services/reportService.js", () => ({
  listProjectReports: vi.fn(),
  getReport: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  deleteReport: vi.fn(),
}));

const AUTH_COOKIE_NAME = "authToken";
const CSRF_COOKIE_NAME = "csrfToken";

const buildAuthCookie = (payload) => {
  const token = jwt.sign(payload, config.jwtSecret);
  return `${AUTH_COOKIE_NAME}=${token}`;
};

const buildCsrfCookie = (token) => `${CSRF_COOKIE_NAME}=${token}`;

const app = createApp({ riskAnalysisEnabled: true });

describe("report routes", () => {
  const authCookie = buildAuthCookie({ id: "user-1", role: "Administrator" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists reports for a project", async () => {
    listProjectReports.mockResolvedValue([{ id: "rep-1", weekKey: "2024-W05" }]);

    const projectId = "11111111-1111-1111-1111-111111111111";
    const res = await request(app)
      .get(`/api/projects/${projectId}/reports`)
      .set("Cookie", [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, reports: [{ id: "rep-1", weekKey: "2024-W05" }] });
    expect(listProjectReports).toHaveBeenCalledWith(projectId, expect.objectContaining({ role: "Administrator" }));
  });

  it("creates a report with weekKey and state", async () => {
    const csrfToken = "csrf-token";
    createReport.mockResolvedValue({ id: "rep-2", weekKey: "2024-W06", state: {} });
    const projectId = "11111111-1111-1111-1111-111111111111";

    const res = await request(app)
      .post(`/api/projects/${projectId}/reports`)
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({ weekKey: "2024-W06", state: { statusItems: [] } });

    expect(res.status).toBe(201);
    expect(createReport).toHaveBeenCalledWith(
      projectId,
      expect.objectContaining({
        weekKey: "2024-W06",
        state: expect.objectContaining({
          statusItems: [],
        }),
      }),
      expect.objectContaining({ role: "Administrator" }),
    );
    expect(res.body.report.weekKey).toBe("2024-W06");
  });

  it("rejects invalid weekKey on create", async () => {
    const csrfToken = "csrf-token";
    const projectId = "11111111-1111-1111-1111-111111111111";

    const res = await request(app)
      .post(`/api/projects/${projectId}/reports`)
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({ weekKey: "invalid", state: {} });

    expect(res.status).toBe(400);
    expect(createReport).not.toHaveBeenCalled();
  });

  it("updates a report", async () => {
    const csrfToken = "csrf-token";
    updateReport.mockResolvedValue({ id: "rep-3", weekKey: "2024-W07", state: { statusItems: [] } });

    const res = await request(app)
      .patch("/api/reports/rep-3")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({ state: { statusItems: [{ id: "item-1", content: "OK" }] } });

    expect(res.status).toBe(200);
    expect(updateReport).toHaveBeenCalledWith(
      "rep-3",
      expect.objectContaining({
        state: expect.objectContaining({
          statusItems: [{ id: "item-1", content: "OK" }],
        }),
      }),
      expect.objectContaining({ role: "Administrator" }),
    );
  });

  it("deletes a report", async () => {
    const csrfToken = "csrf-token";
    deleteReport.mockResolvedValue(undefined);

    const res = await request(app)
      .delete("/api/reports/rep-4")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken);

    expect(res.status).toBe(204);
    expect(deleteReport).toHaveBeenCalledWith("rep-4", expect.objectContaining({ role: "Administrator" }));
  });
});
