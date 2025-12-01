import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  listProjectRisks,
  createProjectRisk,
  updateProjectRisk,
  archiveProjectRisk,
} from "../../services/risk/riskService.js";
import { withTransaction } from "../../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "../../services/workspaceService.js";
import * as riskRepository from "../../repositories/riskRepository.js";
import * as riskValidators from "../../validators/riskValidators.js";

vi.mock("../../repositories/riskRepository.js", () => ({
  ensureProjectExists: vi.fn(),
  isProjectMember: vi.fn(),
  listProjectRisks: vi.fn(),
  insertProjectRisk: vi.fn(),
  fetchRiskById: vi.fn(),
  updateProjectRisk: vi.fn(),
  archiveProjectRisk: vi.fn(),
}));

vi.mock("../../validators/riskValidators.js", () => ({
  parseRiskFilters: vi.fn(),
  parseCreateRiskPayload: vi.fn(),
  parseUpdateRiskPayload: vi.fn(),
}));

vi.mock("../../utils/transactions.js", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("../../services/workspaceService.js", () => ({
  ensureEmployeeLinkForUser: vi.fn(),
}));

describe("riskService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(riskRepository).forEach((fn) => {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    });
    Object.values(riskValidators).forEach((fn) => {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    });
  });

  it("lists project risks with filters and maps response", async () => {
    const projectId = "3c4a3d5f-4829-4a11-8c33-6a82f0e0c4af";
    riskRepository.ensureProjectExists.mockResolvedValue(true);
    riskRepository.isProjectMember.mockResolvedValue({ isMember: true, isLead: true });
    riskValidators.parseRiskFilters.mockReturnValue({ includeArchived: true, status: "open" });
    riskRepository.listProjectRisks.mockResolvedValue([
      {
        id: "risk-1",
        project_id: projectId,
        title: "Vendor delay",
        description: "Awaiting approval",
        probability: 3,
        impact: 4,
        score: 12,
        mitigation_plan_a: "Follow up weekly",
        mitigation_plan_b: "Switch vendor",
        owner_id: "emp-9",
        owner_name: "Alice",
        owner_email: "alice@example.com",
        follow_up_notes: "Meeting booked",
        follow_up_frequency: "Weekly",
        category: "timeline",
        last_follow_up_at: "2025-11-01T00:00:00.000Z",
        due_date: "2025-11-15",
        status: "open",
        is_archived: false,
        created_by: "user-1",
        updated_by: "user-1",
        created_at: new Date("2025-10-30T10:00:00Z"),
        updated_at: new Date("2025-11-02T12:00:00Z"),
      },
    ]);

    const risks = await listProjectRisks(
      projectId,
      { includeArchived: true, status: "open" },
      { id: "admin", role: "Administrator", employeeId: "emp-admin" },
    );

    expect(riskValidators.parseRiskFilters).toHaveBeenCalledWith({ includeArchived: true, status: "open" });
    expect(riskRepository.listProjectRisks).toHaveBeenCalledWith(expect.anything(), {
      projectId,
      filters: { includeArchived: true, status: "open" },
    });
    expect(risks).toHaveLength(1);
    expect(risks[0]).toMatchObject({
      title: "Vendor delay",
      probability: 3,
      impact: 4,
      score: 12,
      owner: { name: "Alice", email: "alice@example.com" },
      category: expect.objectContaining({ key: "timeline" }),
      dueDate: "2025-11-15",
    });
  });

  it("creates project risk and enforces Projektleder permissions", async () => {
    const projectId = "9583f34e-d120-4cc1-90de-070e39d32111";
    riskRepository.ensureProjectExists.mockResolvedValue(true);
    riskRepository.isProjectMember.mockResolvedValue({ isMember: true, isLead: true });
    riskValidators.parseCreateRiskPayload.mockReturnValue({
      title: "Datacenter outage",
      probability: 4,
      impact: 5,
      category: "technical",
      ownerId: "emp-7",
      followUpFrequency: "Monthly",
      dueDate: "2025-12-01",
    });
    riskRepository.insertProjectRisk.mockResolvedValue({
      id: "risk-123",
      project_id: projectId,
      title: "Datacenter outage",
      description: "Risk description",
      probability: 4,
      impact: 5,
      score: 20,
      mitigation_plan_a: "Failover",
      mitigation_plan_b: "Work remote",
      owner_id: "emp-7",
      owner_name: "Bob",
      owner_email: "bob@example.com",
      follow_up_notes: null,
      follow_up_frequency: "Monthly",
      category: "technical",
      last_follow_up_at: null,
      due_date: "2025-12-01",
      status: "open",
      is_archived: false,
      created_by: "user-55",
      updated_by: "user-55",
      created_at: new Date("2025-11-12T10:00:00Z"),
      updated_at: new Date("2025-11-12T10:00:00Z"),
    });

    const mockClient = {};
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({
      id: "user-55",
      role: "Projektleder",
      employeeId: "emp-55",
    });

    const payload = {
      title: "Datacenter outage",
      probability: 4,
      impact: 5,
      category: "technical",
      ownerId: "emp-7",
      followUpFrequency: "Monthly",
      dueDate: "2025-12-01",
    };

    const risk = await createProjectRisk(projectId, payload, { id: "user-55", role: "Projektleder" });
    expect(riskValidators.parseCreateRiskPayload).toHaveBeenCalledWith(payload);
    expect(riskRepository.insertProjectRisk).toHaveBeenCalledWith(mockClient, expect.objectContaining({
      projectId,
      title: "Datacenter outage",
    }));
    expect(risk.title).toBe("Datacenter outage");
    expect(risk.score).toBe(20);
    expect(risk.owner).toMatchObject({ id: "emp-7" });
  });

  it("updates project risk and recalculates score", async () => {
    const riskId = "e12c3321-cc28-45ca-8892-0a987aa5d721";
    const projectId = "23cbdef0-97bb-40a4-8f1d-7adc555c2810";
    const existingRow = {
      id: riskId,
      project_id: projectId,
      title: "Legacy dependency",
      description: "desc",
      probability: 2,
      impact: 3,
      score: 6,
      mitigation_plan_a: null,
      mitigation_plan_b: null,
      owner_id: null,
      owner_name: null,
      owner_email: null,
      follow_up_notes: null,
      follow_up_frequency: null,
      category: "other",
      last_follow_up_at: null,
      due_date: null,
      status: "open",
      is_archived: false,
      created_by: "user-1",
      updated_by: "user-1",
      created_at: new Date("2025-11-01T10:00:00Z"),
      updated_at: new Date("2025-11-01T10:00:00Z"),
    };
    const updatedRow = { ...existingRow, probability: 5, impact: 5, score: 25 };
    const mockClient = {};
    riskRepository.fetchRiskById.mockResolvedValue(existingRow);
    riskRepository.updateProjectRisk.mockResolvedValue(updatedRow);
    riskValidators.parseUpdateRiskPayload.mockReturnValue({ probability: 5, impact: 5 });
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({
      id: "admin-1",
      role: "Administrator",
      employeeId: null,
    });

    const risk = await updateProjectRisk(riskId, { probability: 5, impact: 5 }, { id: "admin-1", role: "Administrator" });
    expect(riskValidators.parseUpdateRiskPayload).toHaveBeenCalledWith({ probability: 5, impact: 5 });
    expect(riskRepository.updateProjectRisk).toHaveBeenCalledWith(mockClient, {
      riskId,
      updates: expect.objectContaining({ probability: 5, impact: 5, score: 25, updatedBy: "admin-1" }),
    });
    expect(risk.score).toBe(25);
  });

  it("archives risk via delete handler", async () => {
    const riskId = "bbc9d4d8-7a14-4f63-b1da-cc1cd1001111";
    const projectId = "83c0f4ef-6d71-45d6-9dea-e0bcf0d48910";
    const mockClient = {};
    riskRepository.fetchRiskById.mockResolvedValue({
      id: riskId,
      project_id: projectId,
      title: "Old risk",
      description: "",
      probability: 1,
      impact: 1,
      score: 1,
      mitigation_plan_a: null,
      mitigation_plan_b: null,
      owner_id: null,
      owner_name: null,
      owner_email: null,
      follow_up_notes: null,
      follow_up_frequency: null,
      category: "other",
      last_follow_up_at: null,
      due_date: null,
      status: "open",
      is_archived: false,
      created_by: "user-1",
      updated_by: "user-1",
      created_at: new Date(),
      updated_at: new Date(),
    });
    riskRepository.archiveProjectRisk.mockResolvedValue();
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({
      id: "admin",
      role: "Administrator",
      employeeId: null,
    });

    const result = await archiveProjectRisk(riskId, { id: "admin", role: "Administrator" });
    expect(result).toEqual({ success: true });
    expect(riskRepository.archiveProjectRisk).toHaveBeenCalledWith(mockClient, riskId, "admin");
  });
});
