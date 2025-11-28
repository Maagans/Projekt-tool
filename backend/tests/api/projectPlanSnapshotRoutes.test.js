// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../app.js";
import { config } from "../../config/index.js";
import { listPlanByProject } from "../../repositories/projectPlanRepository.js";
import {
  replaceReportState,
  getReportState,
  createReport as createReportRepo,
} from "../../repositories/reportRepository.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

const AUTH_COOKIE_NAME = "authToken";
const CSRF_COOKIE_NAME = "csrfToken";
const projectId = "11111111-1111-4111-8111-111111111111";

let projectExists = true;
let membershipAllowed = true;
let storedReportState = null;

const samplePlan = {
  phases: [
    {
      id: "phase-1",
      projectId,
      label: "Analyse",
      startDate: "2024-01-01",
      endDate: "2024-03-01",
      startPercentage: 0,
      endPercentage: 25,
      highlight: "blue",
      status: "on-track",
      workstreamId: null,
      sortOrder: 0,
    },
  ],
  milestones: [
    {
      id: "mile-1",
      projectId,
      workstreamId: null,
      label: "Gate A",
      position: 20,
      dueDate: "2024-02-15",
      status: "planned",
    },
  ],
  deliverables: [
    {
      id: "del-1",
      projectId,
      milestoneId: "mile-1",
      label: "Spec",
      position: 15,
      status: "planned",
      ownerName: "Owner",
      ownerEmployeeId: "emp-1",
      description: "Spec doc",
      notes: null,
      startDate: "2024-01-10",
      endDate: "2024-02-10",
      progress: 10,
      checklist: [
        { id: "chk-1", text: "Draft", completed: false },
      ],
    },
  ],
};

vi.mock("../../db.js", () => {
  const query = vi.fn(async (sql, params = []) => {
    const text = typeof sql === "string" ? sql : sql?.text ?? "";
    const normalized = text.replace(/\s+/g, " ").toLowerCase();

    if (normalized.startsWith("begin") || normalized.startsWith("commit") || normalized.startsWith("rollback")) {
      return { rows: [], rowCount: 0 };
    }

    if (normalized.includes("from projects where id")) {
      if (!projectExists || (params[0] && params[0].toString().startsWith("0000"))) {
        return { rowCount: 0, rows: [] };
      }
      return {
        rowCount: 1,
        rows: [
          {
            id: projectId,
            start_date: new Date(Date.UTC(2024, 0, 1)),
            end_date: new Date(Date.UTC(2024, 11, 31)),
          },
        ],
      };
    }

    if (normalized.includes("from project_members")) {
      return {
        rowCount: membershipAllowed ? 1 : 0,
        rows: membershipAllowed ? [{ "?column?": 1 }] : [],
      };
    }

    if (normalized.startsWith("insert into reports")) {
      return { rowCount: 1, rows: [{ id: "rep-123" }] };
    }

    if (normalized.includes("select project_id from reports")) {
      return { rowCount: 1, rows: [{ project_id: projectId }] };
    }

    return { rows: [], rowCount: 0 };
  });

  const connect = vi.fn(async () => ({
    query,
    release: vi.fn(),
  }));

  return {
    default: {
      query,
      connect,
    },
  };
});

vi.mock("../../repositories/projectPlanRepository.js", () => ({
  listPlanByProject: vi.fn(async () => samplePlan),
}));

vi.mock("../../repositories/reportRepository.js", () => ({
  createReport: vi.fn(async () => "rep-123"),
  replaceReportState: vi.fn(async (_client, _reportId, state) => {
    storedReportState = state;
  }),
  getReportState: vi.fn(async () => storedReportState ?? {}),
  updateReportWeekKey: vi.fn(),
  getReportById: vi.fn(),
  getReportsByProjectId: vi.fn(),
  deleteReport: vi.fn(),
  deleteReports: vi.fn(),
  deleteItems: vi.fn(),
  insertStatusItem: vi.fn(),
  insertChallengeItem: vi.fn(),
  insertNextStepItem: vi.fn(),
  insertMainTableRow: vi.fn(),
  insertRisk: vi.fn(),
  insertPhase: vi.fn(),
  insertMilestone: vi.fn(),
  insertDeliverable: vi.fn(),
  insertDeliverableChecklistItem: vi.fn(),
  insertKanbanTask: vi.fn(),
}));

vi.mock("../../services/workspaceService.js", () => ({
  ensureEmployeeLinkForUser: vi.fn(async (_client, user) => ({
    ...user,
    employeeId: user.employeeId ?? "emp-1",
  })),
}));

const app = createApp({ riskAnalysisEnabled: true });

const buildAuthCookie = (payload) => {
  const token = jwt.sign(payload, config.jwtSecret);
  return `${AUTH_COOKIE_NAME}=${token}`;
};

const buildCsrfCookie = (token) => `${CSRF_COOKIE_NAME}=${token}`;

beforeEach(() => {
  projectExists = true;
  membershipAllowed = true;
  storedReportState = null;
  vi.clearAllMocks();
});

describe("Project plan snapshot routes", () => {
  it("returns a live plan snapshot for a project", async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/plan/snapshot`)
      .set("Cookie", [buildAuthCookie({ id: "user-1", role: "Administrator" })]);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toHaveProperty("snapshot");
    expect(res.body.snapshot).toMatchObject({
      projectId,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });
    expect(res.body.snapshot.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(res.body.snapshot.phases).toEqual(samplePlan.phases);
    expect(res.body.snapshot.milestones).toEqual(samplePlan.milestones);
    expect(res.body.snapshot.deliverables).toEqual(samplePlan.deliverables);
    expect(listPlanByProject).toHaveBeenCalled();
  });

  it("rejects access for non-members", async () => {
    membershipAllowed = false;

    const res = await request(app)
      .get(`/api/projects/${projectId}/plan/snapshot`)
      .set("Cookie", [buildAuthCookie({ id: "user-2", role: "Projektleder", employeeId: "emp-99" })]);

    expect(res.status, JSON.stringify(res.body)).toBe(403);
  });

  it("returns 404 when project is missing", async () => {
    projectExists = false;

    const res = await request(app)
      .get(`/api/projects/${projectId}/plan/snapshot`)
      .set("Cookie", [buildAuthCookie({ id: "user-3", role: "Administrator" })]);

    expect(res.status, JSON.stringify(res.body)).toBe(404);
  });
});

describe("Report creation seeds plan snapshot", () => {
  it("copies live plan into the new report state", async () => {
    const csrf = "csrf-token";
    const res = await request(app)
      .post(`/api/projects/${projectId}/reports`)
      .set("Cookie", [
        buildAuthCookie({ id: "user-4", role: "Administrator" }),
        buildCsrfCookie(csrf),
      ])
      .set("x-csrf-token", csrf)
      .send({
        weekKey: "2024-W05",
        state: {
          statusItems: [{ id: "status-1", content: "All good" }],
          phases: [{ id: "old-phase", text: "Old" }],
        },
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(createReportRepo).toHaveBeenCalledWith(expect.anything(), projectId, "2024-W05");
    expect(replaceReportState).toHaveBeenCalled();
    expect(storedReportState).not.toBeNull();
    expect(storedReportState.statusItems).toEqual([{ id: "status-1", content: "All good" }]);
    expect(storedReportState.phases.map((p) => p.text)).toEqual(samplePlan.phases.map((p) => p.label));
    expect(storedReportState.milestones.map((m) => m.text)).toEqual(samplePlan.milestones.map((m) => m.label));
    expect(storedReportState.deliverables.map((d) => d.text)).toEqual(samplePlan.deliverables.map((d) => d.label));
    expect(getReportState).toHaveBeenCalled();
    expect(res.body.report.state.phases).toHaveLength(samplePlan.phases.length);
    expect(res.body.report.state.milestones).toHaveLength(samplePlan.milestones.length);
    expect(res.body.report.state.deliverables).toHaveLength(samplePlan.deliverables.length);
  });

  it("derives positions from dates when percentages are missing", async () => {
    const csrf = "csrf-token";
    const positionlessPlan = {
      ...samplePlan,
      phases: [
        {
          ...samplePlan.phases[0],
          startPercentage: null,
          endPercentage: null,
          startDate: "2024-03-01",
          endDate: "2024-06-01",
        },
      ],
      milestones: [
        {
          ...samplePlan.milestones[0],
          position: null,
          dueDate: "2024-04-15",
        },
      ],
      deliverables: [
        {
          ...samplePlan.deliverables[0],
          position: null,
          milestoneId: samplePlan.milestones[0].id,
          startDate: "2024-05-01",
          endDate: "2024-05-31",
        },
      ],
    };
    listPlanByProject.mockResolvedValueOnce(positionlessPlan);

    const res = await request(app)
      .post(`/api/projects/${projectId}/reports`)
      .set("Cookie", [
        buildAuthCookie({ id: "user-5", role: "Administrator" }),
        buildCsrfCookie(csrf),
      ])
      .set("x-csrf-token", csrf)
      .send({ weekKey: "2024-W06" });

    const pctBetween = (dateStr) => {
      const start = Date.UTC(2024, 0, 1);
      const end = Date.UTC(2024, 11, 31);
      const [y, m, d] = dateStr.split("-").map((part) => Number.parseInt(part, 10));
      const target = Date.UTC(y, m - 1, d);
      return ((target - start) / (end - start)) * 100;
    };

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(storedReportState.phases[0].start).toBeGreaterThanOrEqual(0);
    expect(storedReportState.phases[0].end).toBeGreaterThanOrEqual(storedReportState.phases[0].start);
    expect(storedReportState.milestones[0].position).toBeGreaterThanOrEqual(0);
    expect(storedReportState.deliverables[0].position).toBeGreaterThanOrEqual(0);
  });
});
