// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import createApp from "../../app.js";
import { attachReportRisks, updateReportRiskSnapshot } from "../../services/reportRiskSnapshotService.js";
import { config } from "../../config/index.js";

vi.mock("../../services/reportRiskSnapshotService.js", () => ({
  attachReportRisks: vi.fn(),
  updateReportRiskSnapshot: vi.fn(),
}));

const AUTH_COOKIE_NAME = "authToken";
const CSRF_COOKIE_NAME = "csrfToken";

const buildAuthCookie = (payload) => {
  const token = jwt.sign(payload, config.jwtSecret);
  return `${AUTH_COOKIE_NAME}=${token}`;
};

const buildCsrfCookie = (token) => `${CSRF_COOKIE_NAME}=${token}`;

const appWithRisk = createApp({ riskAnalysisEnabled: true });
const appWithoutRisk = createApp({ riskAnalysisEnabled: false });

describe("report risk routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches snapshots for a report", async () => {
    attachReportRisks.mockResolvedValue({
      snapshots: [
        {
          id: "snap-1",
          reportId: "10",
          projectRiskId: "risk-1",
          title: "Vendor delay",
          probability: 3,
          impact: 4,
          score: 12,
          category: "timeline",
          status: "open",
        },
      ],
    });

    const csrfToken = "csrf-token";
    const authCookie = buildAuthCookie({ id: "user-1", role: "Administrator" });

    const response = await request(appWithRisk)
      .post("/api/reports/10/risks")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({ riskIds: ["11111111-2222-4333-8444-aaaaaaaaaaaa"] });

    expect(response.status).toBe(201);
    expect(response.body.snapshots).toHaveLength(1);
    expect(attachReportRisks).toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const csrfToken = "csrf-token";
    const response = await request(appWithRisk)
      .post("/api/reports/10/risks")
      .set("Cookie", [buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({ riskIds: [] });

    expect(response.status).toBe(401);
    expect(attachReportRisks).not.toHaveBeenCalled();
  });

  it("validates payload and rejects invalid risk ids", async () => {
    const csrfToken = "csrf-token";
    const authCookie = buildAuthCookie({ id: "user-1", role: "Administrator" });
    const response = await request(appWithRisk)
      .post("/api/reports/10/risks")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({ riskIds: ["not-a-uuid"] });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(attachReportRisks).not.toHaveBeenCalled();
  });

  it("returns 404 when feature flag is disabled", async () => {
    const response = await request(appWithoutRisk).post("/api/reports/10/risks").send({ riskIds: [] });
    expect(response.status).toBe(404);
  });

  it("updates a snapshot position", async () => {
    updateReportRiskSnapshot.mockResolvedValue({
      id: "snap-1",
      reportId: "10",
      projectRiskId: "risk-1",
      title: "Vendor delay",
      probability: 4,
      impact: 5,
      score: 20,
      category: "timeline",
      status: "open",
    });

    const csrfToken = "csrf-token";
    const authCookie = buildAuthCookie({ id: "user-1", role: "Administrator" });

    const response = await request(appWithRisk)
      .patch("/api/reports/10/risks/11111111-2222-4333-8444-aaaaaaaaaaaa")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({ probability: 4, impact: 5 });

    // console.log(response.body);
    expect(response.status).toBe(200);
    expect(response.body.snapshot.score).toBe(20);
    expect(updateReportRiskSnapshot).toHaveBeenCalled();
  });

  it("validates snapshot update payload", async () => {
    const csrfToken = "csrf-token";
    const authCookie = buildAuthCookie({ id: "user-1", role: "Administrator" });

    const response = await request(appWithRisk)
      .patch("/api/reports/10/risks/11111111-2222-4333-8444-aaaaaaaaaaaa")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({ probability: 8, impact: 5 });

    expect(response.status).toBe(400);
    expect(updateReportRiskSnapshot).not.toHaveBeenCalled();
  });
});
