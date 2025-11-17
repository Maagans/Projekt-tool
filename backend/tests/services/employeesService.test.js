import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmployeeRecord,
  updateEmployeeRecord,
  deleteEmployeeRecord,
} from "../../services/employeesService.js";
import { withTransaction } from "../../utils/transactions.js";
import { ensureEmployeeLinkForUser } from "../../services/workspaceService.js";

vi.mock("../../utils/transactions.js", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("../../services/workspaceService.js", async () => {
  const actual = await vi.importActual("../../services/workspaceService.js");
  return {
    ...actual,
    ensureEmployeeLinkForUser: vi.fn(),
  };
});

const createMockClient = (...responses) => {
  const query = vi.fn(async () => {
    if (!responses.length) {
      return { rows: [], rowCount: 0 };
    }
    return responses.shift();
  });
  return { query };
};

describe("employeesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates employee as administrator", async () => {
    const insertResponse = {
      rows: [
        {
          id: "8cfa7c2f-021f-4402-9120-4f3942d905ab",
          name: "Alice",
          email: "alice@example.com",
          location: "Aarhus",
          department: "Aarhus",
          max_capacity_hours_week: 37.5,
          azure_ad_id: null,
          job_title: null,
          account_enabled: true,
          synced_at: null,
        },
      ],
    };
    const mockClient = createMockClient(insertResponse);
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });

    const employee = await createEmployeeRecord(
      { name: " Alice ", email: "ALICE@example.com", location: "Aarhus", maxCapacityHoursWeek: 37.5 },
      { id: "admin-1", role: "Administrator" },
    );

    expect(employee).toMatchObject({
      name: "Alice",
      email: "alice@example.com",
      location: "Aarhus",
      maxCapacityHoursWeek: 37.5,
    });
    expect(mockClient.query).toHaveBeenCalledTimes(1);
    const [, params] = mockClient.query.mock.calls[0];
    expect(params[1]).toBe("Alice");
    expect(params[2]).toBe("alice@example.com");
  });

  it("rejects employee creation for non-admin users", async () => {
    const mockClient = createMockClient();
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "lead-1", role: "Projektleder", employeeId: "emp-1" });

    await expect(
      createEmployeeRecord({ name: "Bob", email: "bob@example.com" }, { id: "lead-1", role: "Projektleder" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it("updates employee when project lead has access", async () => {
    const mockClient = createMockClient(
      { rowCount: 1 }, // assertProjectLeadAccess
      {
        rowCount: 1,
        rows: [
          {
            id: "emp-2",
            name: "Line",
            email: "line@example.com",
            location: "KBH",
            department: "KBH",
            max_capacity_hours_week: 30,
            azure_ad_id: null,
            job_title: null,
            account_enabled: true,
            synced_at: null,
          },
        ],
      },
      {
        rows: [
          {
            id: "emp-2",
            name: "Line Updated",
            email: "line@example.com",
            location: "Odense",
            department: "Odense",
            max_capacity_hours_week: 32,
            azure_ad_id: null,
            job_title: null,
            account_enabled: true,
            synced_at: null,
          },
        ],
      },
    );
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({
      id: "lead-1",
      role: "Projektleder",
      employeeId: "emp-lead",
    });

    const result = await updateEmployeeRecord(
      "emp-2",
      { name: "Line Updated", location: "Odense", maxCapacityHoursWeek: 32 },
      { id: "lead-1", role: "Projektleder" },
    );

    expect(result).toMatchObject({
      id: "emp-2",
      name: "Line Updated",
      location: "Odense",
      maxCapacityHoursWeek: 32,
    });
    expect(mockClient.query).toHaveBeenCalledTimes(3);
    const updateCall = mockClient.query.mock.calls[2];
    expect(updateCall[0]).toContain("UPDATE employees");
    expect(updateCall[1]).toEqual(expect.arrayContaining(["Line Updated"]));
  });

  it("deletes employee when administrator", async () => {
    const mockClient = createMockClient(
      {
        rowCount: 1,
        rows: [
          {
            id: "emp-3",
            name: "Delete Me",
            email: "deleteme@example.com",
            location: "Aarhus",
            department: "Aarhus",
            max_capacity_hours_week: 37,
            azure_ad_id: null,
            job_title: null,
            account_enabled: true,
            synced_at: null,
          },
        ],
      },
      { rowCount: 1 },
      { rowCount: 1 },
    );
    withTransaction.mockImplementation(async (callback) => callback(mockClient));
    ensureEmployeeLinkForUser.mockResolvedValue({ id: "admin-1", role: "Administrator" });

    await deleteEmployeeRecord("emp-3", { id: "admin-1", role: "Administrator" });
    expect(mockClient.query).toHaveBeenCalledTimes(3);
    expect(mockClient.query.mock.calls[1][0]).toContain("DELETE FROM project_members");
    expect(mockClient.query.mock.calls[2][0]).toContain("DELETE FROM employees");
  });
});
