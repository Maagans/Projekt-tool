// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import createApp from "../../app.js";
import { config } from "../../config/index.js";
import {
  listProjectRisks,
  createProjectRisk,
  updateProjectRisk,
  archiveProjectRisk,
} from "../../services/risk/riskService.js";

vi.mock("../../services/risk/riskService.js", () => ({
  listProjectRisks: vi.fn(),
  createProjectRisk: vi.fn(),
  updateProjectRisk: vi.fn(),
  archiveProjectRisk: vi.fn(),
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

describe("project risk routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns project risks with parsed filters", async () => {
    const authCookie = buildAuthCookie({ id: "user-1", role: "Administrator" });
    listProjectRisks.mockResolvedValue([
      { id: "risk-1", title: "Delay", category: { key: "timeline" } },
    ]);

    const response = await request(appWithRisk)
      .get("/api/projects/11111111-1111-4111-8111-111111111111/risks?status=open&includeArchived=true&overdue=true")
      .set("Cookie", [authCookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.risks).toHaveLength(1);
    expect(listProjectRisks).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      { status: "open", includeArchived: true, overdue: true },
      expect.any(Object),
    );
  });

  it("creates project risk", async () => {
    const csrfToken = "csrf-token";
    const authCookie = buildAuthCookie({ id: "user-2", role: "Projektleder" });
    createProjectRisk.mockResolvedValue({ id: "risk-2", title: "Outage" });

    const response = await request(appWithRisk)
      .post("/api/projects/aaaa1111-bbbb-4222-9333-ccccdddd0000/risks")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({
        title: "Outage",
        probability: 4,
        impact: 5,
        category: "technical",
      });

    expect(response.status).toBe(201);
    expect(createProjectRisk).toHaveBeenCalledWith(
      "aaaa1111-bbbb-4222-9333-ccccdddd0000",
      expect.objectContaining({ title: "Outage" }),
      expect.any(Object),
    );
  });

  it("updates project risk", async () => {
    const csrfToken = "csrf-token";
    const authCookie = buildAuthCookie({ id: "user-3", role: "Administrator" });
    updateProjectRisk.mockResolvedValue({ id: "risk-3", probability: 5 });

    const response = await request(appWithRisk)
      .patch("/api/risks/22222222-3333-4abc-8def-666666666666")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({ probability: 5 });

    expect(response.status).toBe(200);
    expect(updateProjectRisk).toHaveBeenCalledWith(
      "22222222-3333-4abc-8def-666666666666",
      { probability: 5 },
      expect.any(Object),
    );
  });

  it("archives project risk", async () => {
    const csrfToken = "csrf-token";
    const authCookie = buildAuthCookie({ id: "user-4", role: "Administrator" });
    archiveProjectRisk.mockResolvedValue({ success: true });

    const response = await request(appWithRisk)
      .delete("/api/risks/99999999-8888-4aaa-8bbb-cccccccccccc")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken);

    expect(response.status).toBe(200);
    expect(archiveProjectRisk).toHaveBeenCalledWith(
      "99999999-8888-4aaa-8bbb-cccccccccccc",
      expect.any(Object),
    );
  });

  it("rejects invalid identifiers", async () => {
    const authCookie = buildAuthCookie({ id: "user-5", role: "Administrator" });
    const response = await request(appWithRisk).get("/api/projects/not-a-uuid/risks").set("Cookie", [authCookie]);
    expect(response.status).toBe(400);
    expect(listProjectRisks).not.toHaveBeenCalled();
  });

  it("returns 404 when feature flag is disabled", async () => {
    const authCookie = buildAuthCookie({ id: "user-6", role: "Administrator" });
    const response = await request(appWithoutRisk)
      .get("/api/projects/11111111-1111-4111-8111-111111111111/risks")
      .set("Cookie", [authCookie]);
    expect(response.status).toBe(404);
    expect(listProjectRisks).not.toHaveBeenCalled();
  });
});
