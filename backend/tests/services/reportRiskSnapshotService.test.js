import { describe, it, expect, beforeEach, vi } from "vitest";
import { attachReportRisks, updateReportRiskSnapshot } from "../../services/reportRiskSnapshotService.js";
import { withTransaction } from "../../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "../../services/workspaceService.js";

vi.mock("../../utils/transactions.js", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("../../services/workspaceService.js", () => ({
  ensureEmployeeLinkForUser: vi.fn(),
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

describe("reportRiskSnapshotService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches curated risks and returns snapshots", async () => {
    const mockClient = createMockClient(
      { rowCount: 1, rows: [{ id: "10", project_id: "11111111-1111-4111-8111-111111111111", week_key: "2025-W01" }] },
      { rowCount: 1, rows: [{ is_project_lead: true }] },
      { rowCount: 0, rows: [] }, // delete old snapshots
      { rowCount: 0, rows: [] }, // insert from select
      {
        rows: [
          {
            id: "snap-1",
            report_id: "10",
            project_risk_id: "risk-1",
            title: "Vendor delay",
            description: "Awaiting approval",
            probability: 3,
            impact: 4,
            score: 12,
            category: "timeline",
            status: "open",
            owner_name: "Alice",
            owner_email: "alice@example.com",
            mitigation_plan_a: null,
            mitigation_plan_b: null,
            follow_up_notes: null,
            follow_up_frequency: null,
            due_date: null,
            last_follow_up_at: null,
            created_at: new Date(),
            project_risk_archived: false,
            project_risk_updated_at: new Date(),
          },
        ],
      },
    );

    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({
      id: "user-1",
      role: "Projektleder",
      employeeId: "emp-1",
    });

    const result = await attachReportRisks("10", ["risk-1"], { id: "user-1", role: "Projektleder" });
    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0]).toMatchObject({
      projectRiskId: "risk-1",
      title: "Vendor delay",
      probability: 3,
      impact: 4,
    });
    expect(withTransaction).toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalled();
  });

  it("updates a snapshot position", async () => {
    const mockClient = createMockClient(
      { rowCount: 1, rows: [{ id: "10", project_id: "11111111-1111-4111-8111-111111111111", week_key: "2025-W01" }] },
      { rowCount: 1, rows: [{ is_project_lead: true }] },
      { rowCount: 1, rows: [{ id: "snap-1" }] },
      { rowCount: 1, rows: [] },
      {
        rowCount: 1,
        rows: [
          {
            id: "snap-1",
            report_id: "10",
            project_risk_id: "risk-1",
            title: "Vendor delay",
            description: "Awaiting approval",
            probability: 4,
            impact: 5,
            score: 20,
            category: "timeline",
            status: "open",
            owner_name: "Alice",
            owner_email: "alice@example.com",
            mitigation_plan_a: null,
            mitigation_plan_b: null,
            follow_up_notes: null,
            follow_up_frequency: null,
            due_date: null,
            last_follow_up_at: null,
            created_at: new Date(),
            project_risk_archived: false,
            project_risk_updated_at: new Date(),
          },
        ],
      },
    );

    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({
      id: "user-1",
      role: "Projektleder",
      employeeId: "emp-1",
    });

    const snapshot = await updateReportRiskSnapshot(
      "10",
      "snap-1",
      { probability: 4, impact: 5 },
      { id: "user-1", role: "Projektleder" },
    );
    expect(snapshot.score).toBe(20);
    expect(snapshot.probability).toBe(4);
    expect(snapshot.impact).toBe(5);
    expect(mockClient.query).toHaveBeenCalled();
  });
});
