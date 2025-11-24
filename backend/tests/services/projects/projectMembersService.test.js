import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addProjectMemberRecord,
  updateProjectMemberRecord,
  deleteProjectMemberRecord,
} from "../../../services/projects/projectMembersService.js";
import { withTransaction } from "../../../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "../../../services/workspaceService.js";
import * as projectMembersRepository from "../../../repositories/projectMembersRepository.js";

vi.mock("../../../utils/transactions.js", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("../../../services/workspaceService.js", () => ({
  ensureEmployeeLinkForUser: vi.fn(),
}));

vi.mock("../../../repositories/projectMembersRepository.js", () => ({
  isLeadForProjectEmployee: vi.fn(),
  existsForProjectEmployee: vi.fn(),
  insertMember: vi.fn(),
  findById: vi.fn(),
  updateMember: vi.fn(),
  deleteMember: vi.fn(),
}));

describe("projectMembersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds project member as administrator", async () => {
    const mockClient = { query: vi.fn().mockResolvedValue({ rows: [{ id: "emp-1" }], rowCount: 1 }) }; // ensure employee
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });
    projectMembersRepository.existsForProjectEmployee.mockResolvedValue(null);
    projectMembersRepository.insertMember.mockResolvedValue();
    projectMembersRepository.findById.mockResolvedValue({
      id: "member-1",
      project_id: "proj-1",
      employee_id: "emp-1",
      role: "Udvikler",
      member_group: "unassigned",
      is_project_lead: false,
    });

    const result = await addProjectMemberRecord(
      "proj-1",
      { employeeId: "emp-1", role: "Udvikler" },
      { id: "admin-1", role: "Administrator" },
    );

    expect(result).toMatchObject({ employeeId: "emp-1", projectId: "proj-1" });
    expect(projectMembersRepository.insertMember).toHaveBeenCalled();
  });

  it("updates project member as project lead", async () => {
    const mockClient = { query: vi.fn() };
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({
      id: "lead-1",
      role: "Projektleder",
      employeeId: "emp-99",
    });
    projectMembersRepository.isLeadForProjectEmployee.mockResolvedValue(true);
    projectMembersRepository.updateMember.mockResolvedValue(true);
    projectMembersRepository.findById.mockResolvedValue({
      id: "member-1",
      project_id: "proj-1",
      employee_id: "emp-1",
      role: "Opdateret",
      member_group: "unassigned",
      is_project_lead: true,
    });

    const member = await updateProjectMemberRecord(
      "proj-1",
      "member-1",
      { role: "Opdateret", isProjectLead: true },
      { id: "lead-1", role: "Projektleder" },
    );

    expect(member).toMatchObject({ id: "member-1", role: "Opdateret", isProjectLead: true });
    expect(projectMembersRepository.updateMember).toHaveBeenCalled();
  });

  it("deletes project member as administrator", async () => {
    const mockClient = { query: vi.fn().mockResolvedValue({ rowCount: 1 }) };
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });
    projectMembersRepository.deleteMember.mockResolvedValue(true);

    const response = await deleteProjectMemberRecord("proj-1", "member-1", {
      id: "admin-1",
      role: "Administrator",
    });

    expect(response).toEqual({ success: true });
    expect(projectMembersRepository.deleteMember).toHaveBeenCalledWith(mockClient, "proj-1", "member-1");
  });
});
