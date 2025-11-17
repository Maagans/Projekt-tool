import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addProjectMemberRecord,
  updateProjectMemberRecord,
  deleteProjectMemberRecord,
} from "../../../services/projects/projectMembersService.js";
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

describe("projectMembersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds project member as administrator", async () => {
    const mockClient = createMockClient(
      { rows: [{ id: "emp-1" }], rowCount: 1 }, // ensure employee
      { rows: [], rowCount: 0 }, // existing member
      { rows: [], rowCount: 0 }, // insert
      {
        rows: [
          {
            id: "member-1",
            project_id: "proj-1",
            employee_id: "emp-1",
            role: "Ny rolle",
            member_group: "unassigned",
            is_project_lead: false,
          },
        ],
      },
    );
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });

    const result = await addProjectMemberRecord(
      "proj-1",
      { employeeId: "emp-1", role: "Udvikler" },
      { id: "admin-1", role: "Administrator" },
    );

    expect(result).toMatchObject({ employeeId: "emp-1", projectId: "proj-1" });
    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  it("updates project member as project lead", async () => {
    const mockClient = createMockClient(
      { rowCount: 1 }, // assert lead
      { rowCount: 1 }, // update
      {
        rows: [
          {
            id: "member-1",
            project_id: "proj-1",
            employee_id: "emp-1",
            role: "Opdateret",
            member_group: "unassigned",
            is_project_lead: true,
          },
        ],
      },
    );
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({
      id: "lead-1",
      role: "Projektleder",
      employeeId: "emp-99",
    });

    const member = await updateProjectMemberRecord(
      "proj-1",
      "member-1",
      { role: "Opdateret", isProjectLead: true },
      { id: "lead-1", role: "Projektleder" },
    );

    expect(member).toMatchObject({ id: "member-1", role: "Opdateret", isProjectLead: true });
    expect(mockClient.query).toHaveBeenCalledTimes(3);
  });

  it("deletes project member as administrator", async () => {
    const mockClient = createMockClient({ rowCount: 1 });
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });

    const response = await deleteProjectMemberRecord("proj-1", "member-1", {
      id: "admin-1",
      role: "Administrator",
    });

    expect(response).toEqual({ success: true });
    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });
});
