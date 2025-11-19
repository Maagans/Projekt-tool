// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

const employeesTable = new Map();
const usersTable = new Map();
const workspaceSettings = {
  pmoBaselineHoursWeek: 0,
  updatedBy: null,
};

const normaliseEmail = (value) => value?.toLowerCase?.() ?? value ?? null;

const createQueryHandler = () => {
  return vi.fn(async (sql, params = []) => {
    const text = typeof sql === "string" ? sql : sql?.text ?? String(sql ?? "");
    const trimmed = text.replace(/\s+/g, " ").trim();

    if (!trimmed) {
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.toUpperCase() === "BEGIN" || trimmed.toUpperCase() === "COMMIT" || trimmed.toUpperCase() === "ROLLBACK") {
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith("SELECT 1 FROM employees WHERE id =")) {
      const employeeId = params[0];
      return employeesTable.has(employeeId)
        ? { rowCount: 1, rows: [{ "?column?": 1 }] }
        : { rowCount: 0, rows: [] };
    }

    if (trimmed.startsWith("SELECT id::text FROM employees WHERE LOWER(email) =")) {
      const email = params[0];
      const match = [...employeesTable.values()].find((row) => normaliseEmail(row.email) === normaliseEmail(email));
      return match ? { rowCount: 1, rows: [{ id: match.id }] } : { rowCount: 0, rows: [] };
    }

    if (trimmed.startsWith("SELECT employee_id::text, email FROM users WHERE id =")) {
      const userId = params[0];
      const user = usersTable.get(userId);
      return user
        ? { rowCount: 1, rows: [{ employee_id: user.employeeId ?? null, email: user.email ?? null }] }
        : { rowCount: 0, rows: [] };
    }

    if (trimmed.startsWith("UPDATE users SET employee_id =")) {
      const [employeeId, userId] = params;
      const user = usersTable.get(userId);
      if (user) {
        usersTable.set(userId, { ...user, employeeId });
      }
      return { rowCount: 1, rows: [] };
    }

    if (trimmed.startsWith("SELECT COALESCE(pmo_baseline_hours_week")) {
      return {
        rows: [
          {
            baseline: workspaceSettings.pmoBaselineHoursWeek,
          },
        ],
      };
    }

    if (trimmed.startsWith("INSERT INTO workspace_settings")) {
      const [, baselineParam, updatedByParam] = params;
      workspaceSettings.pmoBaselineHoursWeek =
        typeof baselineParam === "number" ? baselineParam : Number(baselineParam ?? 0) || 0;
      workspaceSettings.updatedBy = updatedByParam ?? null;
      return { rowCount: 1, rows: [] };
    }

    if (trimmed.startsWith("SELECT id::text, name, email, COALESCE(location, '') AS location")) {
      const rows = [...employeesTable.values()]
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        .map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          location: row.location ?? null,
          max_capacity_hours_week: row.max_capacity_hours_week ?? 0,
          azure_ad_id: row.azure_ad_id ?? null,
          department: row.department ?? null,
          job_title: row.job_title ?? null,
          account_enabled: row.account_enabled ?? true,
          synced_at: row.synced_at ?? null,
        }));
      return { rows };
    }

    if (trimmed.startsWith("SELECT id::text, email, location, azure_ad_id, department, job_title, account_enabled, synced_at FROM employees")) {
      const rows = [...employeesTable.values()].map((row) => ({
        id: row.id,
        email: row.email,
        location: row.location ?? null,
        azure_ad_id: row.azure_ad_id ?? null,
        department: row.department ?? null,
        job_title: row.job_title ?? null,
        account_enabled: row.account_enabled ?? true,
        synced_at: row.synced_at ?? null,
      }));
      return { rows };
    }

    if (trimmed.startsWith("INSERT INTO employees (id, name, email, location, department, max_capacity_hours_week)")) {
      const [id, name, email, locationParam, departmentParam, capacityParam] = params;
      const canonicalValue =
        (typeof locationParam === "string" && locationParam.trim().length > 0 ? locationParam.trim() : null) ??
        (typeof departmentParam === "string" && departmentParam.trim().length > 0 ? departmentParam.trim() : null) ??
        null;

      const nextRecord = {
        id,
        name,
        email: normaliseEmail(email),
        location: canonicalValue,
        department: canonicalValue,
        max_capacity_hours_week: typeof capacityParam === "number" ? capacityParam : Number(capacityParam ?? 0) || 0,
        azure_ad_id: null,
        job_title: null,
        account_enabled: true,
        synced_at: null,
      };

      employeesTable.set(id, nextRecord);
      return { rowCount: 1, rows: [] };
    }

    if (trimmed.startsWith("SELECT id::text, name, start_date, end_date, status, description FROM projects")) {
      return { rows: [] };
    }

    if (trimmed.startsWith("SELECT id::text, project_id::text, employee_id::text, role, member_group, is_project_lead FROM project_members")) {
      return { rows: [] };
    }

    if (trimmed.startsWith("SELECT project_member_id::text AS member_id, week_key")) {
      return { rows: [] };
    }

    if (trimmed.startsWith("SELECT id::text, project_id::text, week_key FROM reports")) {
      return { rows: [] };
    }

    if (trimmed.includes('FROM project_workstreams')) {
      return { rows: [] };
    }

    if (trimmed.includes('FROM report_deliverable_checklist')) {
      return { rows: [] };
    }

    if (trimmed.includes('SELECT id::text, name, start_date, end_date, status, description, project_goal, business_case, total_budget, hero_image_url FROM projects')) {
      return {
        rows: [
          {
            id: 'proj-1',
            name: 'Apollo',
            start_date: new Date('2025-01-01'),
            end_date: new Date('2025-06-30'),
            status: 'active',
            description: 'Strategisk initiativ',
            project_goal: '<p>Mål</p>',
            business_case: '<p>Case</p>',
            total_budget: 1000000,
            hero_image_url: null,
          },
        ],
      };
    }

    throw new Error(`Unhandled query: ${trimmed}`);
  });
};

vi.mock("../../db.js", () => {
  const pool = {
    query: vi.fn(),
    connect: vi.fn(),
  };
  return { default: pool };
});

import pool from "../../db.js";
import { config } from "../../config/index.js";
import { createApp } from "../../app.js";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from "../../utils/cookies.js";

config.jwtSecret = "test-secret";
config.features.resourcesAnalyticsEnabled = false;

const buildAuthCookie = (payload) => {
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "1h" });
  return `${AUTH_COOKIE_NAME}=${token}`;
};

const buildCsrfCookie = (token) => `${CSRF_COOKIE_NAME}=${token}`;

const app = createApp({ resourcesAnalyticsEnabled: false });

describe("Workspace routes", () => {
  beforeEach(() => {
    employeesTable.clear();
    usersTable.clear();
    workspaceSettings.pmoBaselineHoursWeek = 0;
    workspaceSettings.updatedBy = null;

    pool.query.mockReset();
    pool.connect.mockReset();

    employeesTable.set("b54d8b63-02c1-4bf5-9c17-111111111111", {
      id: "b54d8b63-02c1-4bf5-9c17-111111111111",
      name: "Existing Employee",
      email: "existing@example.com",
      location: "",
      department: "IT",
      max_capacity_hours_week: 37.5,
      azure_ad_id: null,
      job_title: null,
      account_enabled: true,
      synced_at: null,
    });

    usersTable.set("user-1", {
      id: "user-1",
      employeeId: "b54d8b63-02c1-4bf5-9c17-111111111111",
      email: "admin@example.com",
      name: "Admin",
    });

    const queryHandler = createQueryHandler();
    pool.query.mockImplementation(queryHandler);
    pool.connect.mockResolvedValue({
      query: queryHandler,
      release: vi.fn(),
    });
  });

  it("mirrors department into location when fetching workspace data", async () => {
    const authCookie = buildAuthCookie({
      id: "user-1",
      role: "Administrator",
      employeeId: "b54d8b63-02c1-4bf5-9c17-111111111111",
      email: "admin@example.com",
      name: "Admin",
    });

    const getResponse = await request(app)
      .get("/api/workspace")
      .set("Cookie", [authCookie]);

    expect(getResponse.status).toBe(200);
    const [fetchedEmployee] = getResponse.body.employees;
    expect(fetchedEmployee.location).toBe("IT");
    expect(fetchedEmployee.department).toBe("IT");
    expect(getResponse.body.settings).toEqual({ pmoBaselineHoursWeek: 0 });
  });

  it("updates PMO baseline via workspace settings endpoint", async () => {
    const csrfToken = "csrf-token";
    const authCookie = buildAuthCookie({
      id: "user-1",
      role: "Administrator",
      employeeId: "b54d8b63-02c1-4bf5-9c17-111111111111",
      email: "admin@example.com",
      name: "Admin",
    });

    const patchResponse = await request(app)
      .patch("/api/workspace/settings")
      .set("Cookie", [authCookie, buildCsrfCookie(csrfToken)])
      .set("x-csrf-token", csrfToken)
      .send({
        pmoBaselineHoursWeek: 185.5,
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.success).toBe(true);
    expect(patchResponse.body.settings).toEqual({ pmoBaselineHoursWeek: 185.5 });

    const getResponse = await request(app)
      .get("/api/workspace")
      .set("Cookie", [authCookie]);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.settings).toEqual({ pmoBaselineHoursWeek: 185.5 });
  });
});
