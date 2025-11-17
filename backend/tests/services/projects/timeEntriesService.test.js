import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateProjectTimeEntries } from "../../../services/projects/timeEntriesService.js";
import { withTransaction } from "../../../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "../../../services/workspaceService.js";

vi.mock("../../../utils/transactions.js", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("../../../services/workspaceService.js", () => ({
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

describe("timeEntriesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows team member to update own actual hours", async () => {
    const mockClient = createMockClient(
      { rows: [], rowCount: 0 }, // existing entry
      {
        rowCount: 1,
        rows: [
          {
            id: "member-1",
            project_id: "proj-1",
            employee_id: "emp-1",
            role: "Developer",
            member_group: "team",
            is_project_lead: false,
          },
        ],
      },
      { rowCount: 1, rows: [{ week_key: "2024-W10", planned_hours: 0, actual_hours: 5 }] },
    );
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ role: "Teammedlem", employeeId: "emp-1" });

    const response = await updateProjectTimeEntries(
      { projectId: "proj-1", memberId: "member-1", weekKey: "2024-W10", actualHours: 5 },
      { id: "user-1", role: "Teammedlem" },
    );

    expect(response.success).toBe(true);
    expect(mockClient.query).toHaveBeenCalledTimes(4);
    const insertCall = mockClient.query.mock.calls[2];
    expect(insertCall[0]).toContain("project_member_time_entries");
  });

  it("rejects team member updating someone else's entry", async () => {
    const mockClient = createMockClient(
      { rows: [], rowCount: 0 },
      {
        rowCount: 1,
        rows: [
          {
            id: "member-1",
            project_id: "proj-1",
            employee_id: "emp-2",
            role: "Developer",
            member_group: "team",
            is_project_lead: false,
          },
        ],
      },
    );
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ role: "Teammedlem", employeeId: "emp-1" });

    await expect(
      updateProjectTimeEntries(
        { projectId: "proj-1", memberId: "member-1", weekKey: "2024-W10", actualHours: 2 },
        { id: "user-1", role: "Teammedlem" },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
