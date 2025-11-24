import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateProjectTimeEntries } from "../../../services/projects/timeEntriesService.js";
import { withTransaction } from "../../../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "../../../services/workspaceService.js";
import {
  findMemberById,
  getTimeEntryForWeek,
  isProjectLeadForEmployee,
  listTimeEntriesForMember,
  upsertTimeEntry,
} from "../../../repositories/timeEntriesRepository.js";

vi.mock("../../../utils/transactions.js", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("../../../services/workspaceService.js", () => ({
  ensureEmployeeLinkForUser: vi.fn(),
}));

vi.mock("../../../repositories/timeEntriesRepository.js", () => ({
  findMemberById: vi.fn(),
  isProjectLeadForEmployee: vi.fn(),
  getTimeEntryForWeek: vi.fn(),
  upsertTimeEntry: vi.fn(),
  listTimeEntriesForMember: vi.fn(),
}));

describe("timeEntriesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows team member to update own actual hours", async () => {
    const mockClient = {};
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ role: "Teammedlem", employeeId: "emp-1" });
    findMemberById.mockResolvedValue({
      id: "member-1",
      project_id: "proj-1",
      employee_id: "emp-1",
      role: "Developer",
      member_group: "team",
      is_project_lead: false,
    });
    getTimeEntryForWeek.mockResolvedValue(null);
    listTimeEntriesForMember.mockResolvedValue([{ weekKey: "2024-W10", plannedHours: 0, actualHours: 5 }]);

    const response = await updateProjectTimeEntries(
      { projectId: "proj-1", memberId: "member-1", weekKey: "2024-W10", actualHours: 5 },
      { id: "user-1", role: "Teammedlem" },
    );

    expect(response.success).toBe(true);
    expect(findMemberById).toHaveBeenCalledWith(mockClient, "member-1");
    expect(upsertTimeEntry).toHaveBeenCalledWith(mockClient, expect.objectContaining({ memberId: "member-1" }));
  });

  it("rejects team member updating someone else's entry", async () => {
    const mockClient = {};
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ role: "Teammedlem", employeeId: "emp-1" });
    findMemberById.mockResolvedValue({
      id: "member-1",
      project_id: "proj-1",
      employee_id: "emp-2",
      role: "Developer",
      member_group: "team",
      is_project_lead: false,
    });

    await expect(
      updateProjectTimeEntries(
        { projectId: "proj-1", memberId: "member-1", weekKey: "2024-W10", actualHours: 2 },
        { id: "user-1", role: "Teammedlem" },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows project lead to set planned/actual hours", async () => {
    const mockClient = {};
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ role: "Projektleder", employeeId: "emp-3" });
    findMemberById.mockResolvedValue({
      id: "member-2",
      project_id: "proj-2",
      employee_id: "emp-4",
      role: "Developer",
      member_group: "team",
      is_project_lead: false,
    });
    getTimeEntryForWeek.mockResolvedValue({ plannedHours: 1, actualHours: 2 });
    isProjectLeadForEmployee.mockResolvedValue(true);
    listTimeEntriesForMember.mockResolvedValue([{ weekKey: "2024-W11", plannedHours: 3, actualHours: 4 }]);

    const result = await updateProjectTimeEntries(
      { projectId: "proj-2", memberId: "member-2", weekKey: "2024-W11", plannedHours: 5, actualHours: 6 },
      { id: "lead-1", role: "Projektleder" },
    );

    expect(result.success).toBe(true);
    expect(isProjectLeadForEmployee).toHaveBeenCalledWith(mockClient, "proj-2", "emp-3");
    expect(upsertTimeEntry).toHaveBeenCalledWith(mockClient, {
      memberId: "member-2",
      weekKey: "2024-W11",
      plannedHours: 5,
      actualHours: 6,
    });
  });
});
