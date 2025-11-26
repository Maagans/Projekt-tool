import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProjectRecord,
  updateProjectRecord,
  deleteProjectRecord,
} from "../../../services/projects/projectService.js";
import { withTransaction } from "../../../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "../../../services/workspaceService.js";
import { syncProjectReports } from "../../../services/projects/projectSyncService.js";

vi.mock("../../../utils/transactions.js", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("../../../services/workspaceService.js", () => ({
  ensureEmployeeLinkForUser: vi.fn(),
}));

vi.mock("../../../services/projects/projectSyncService.js", () => ({
  syncProjectReports: vi.fn(),
  syncProjectWorkstreams: vi.fn(),
}));

const createMockClient = (...responses) => {
  const query = vi.fn(async () => {
    if (!responses.length) {
      return { rows: [], rowCount: 0 };
    }
    return responses.shift();
  });
  return { query };
};

const emptyReportState = {
  statusItems: [],
  challengeItems: [],
  nextStepItems: [],
  mainTableRows: [],
  risks: [],
  phases: [],
  milestones: [],
  deliverables: [],
  kanbanTasks: [],
};

describe("projectService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates project as administrator and auto-assigns leader when needed", async () => {
    const mockClient = createMockClient(
      { rowCount: 0 },
      { rows: [{ id: "proj-1" }] },
      { rowCount: 0 },
    );
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });

    const projectId = await createProjectRecord(
      { config: { projectName: "Nyt projekt" } },
      { id: "admin-1", role: "Administrator" },
    );

    expect(projectId).toBe("proj-1");
    expect(mockClient.query).toHaveBeenCalledTimes(2);
  });

  it("creates project with initial reports and syncs state", async () => {
    const mockClient = createMockClient(
      { rowCount: 0 },
      { rows: [{ id: "proj-1" }] },
      { rowCount: 0 },
    );
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });

    await createProjectRecord(
      { reports: [{ weekKey: "2024-W10", state: emptyReportState }] },
      { id: "admin-1", role: "Administrator" },
    );

    expect(syncProjectReports).toHaveBeenCalledTimes(1);
    expect(syncProjectReports).toHaveBeenCalledWith(
      mockClient,
      "proj-1",
      expect.arrayContaining([{ weekKey: "2024-W10", state: emptyReportState }]),
    );
  });

  it("updates project as project lead", async () => {
    const mockClient = createMockClient(
      { rowCount: 1 }, // check lead
      {
        rowCount: 1,
        rows: [
          {
            name: "Nyt projekt",
            start_date: new Date("2024-01-01"),
            end_date: new Date("2024-06-01"),
            status: "active",
            description: "",
          },
        ],
      },
      { rowCount: 1, rows: [{ id: "proj-1" }] },
    );
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({
      id: "lead-1",
      role: "Projektleder",
      employeeId: "emp-1",
    });

    const projectId = await updateProjectRecord(
      "proj-1",
      { config: { projectName: "Opdateret" }, reports: [{ weekKey: "2024-W10", state: emptyReportState }] },
      { id: "lead-1", role: "Projektleder" },
    );

    expect(projectId).toBe("proj-1");
    expect(mockClient.query).toHaveBeenCalledTimes(3);
    expect(mockClient.query.mock.calls[2][0]).toContain("UPDATE projects");
    expect(syncProjectReports).toHaveBeenCalledTimes(1);
  });

  it("deletes project as administrator", async () => {
    const mockClient = createMockClient({ rowCount: 1 });
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });

    const result = await deleteProjectRecord("proj-1", { id: "admin-1", role: "Administrator" });
    expect(result).toEqual({ success: true });
    expect(mockClient.query).toHaveBeenCalledTimes(1);
    expect(mockClient.query.mock.calls[0][0]).toContain("DELETE FROM projects");
  });

  it("rejects project delete for non-lead projectleder", async () => {
    const mockClient = createMockClient({ rows: [] });
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "lead-1", role: "Projektleder", employeeId: "emp-1" });

    await expect(deleteProjectRecord("proj-1", { id: "lead-1", role: "Projektleder" })).rejects.toMatchObject({
      status: 403,
    });
  });
});
