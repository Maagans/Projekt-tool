import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findMemberById,
  getTimeEntryForWeek,
  isProjectLeadForEmployee,
  listTimeEntriesForMember,
  upsertTimeEntry,
} from "../../repositories/timeEntryRepository.js";

const query = vi.fn();
const client = { query };

describe("timeEntryRepository", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("returns member when found", async () => {
    query.mockResolvedValue({
      rows: [{ id: "m1", project_id: "p1", employee_id: "e1", role: "Dev", member_group: "team", is_project_lead: false }],
    });

    const member = await findMemberById(client, "m1");

    expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM project_members"), ["m1"]);
    expect(member?.id).toBe("m1");
  });

  it("checks project lead membership", async () => {
    query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1 }] });

    const isLead = await isProjectLeadForEmployee(client, "p1", "e1");

    expect(isLead).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("is_project_lead"), ["p1", "e1"]);
  });

  it("gets existing time entry for week", async () => {
    query.mockResolvedValue({ rows: [{ plannedHours: 2, actualHours: 3 }] });

    const entry = await getTimeEntryForWeek(client, "member-1", "2024-W12");

    expect(entry).toEqual({ plannedHours: 2, actualHours: 3 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM project_member_time_entries"), ["member-1", "2024-W12"]);
  });

  it("lists time entries with numeric values", async () => {
    query.mockResolvedValue({
      rows: [
        { weekKey: "2024-W01", plannedHours: 1, actualHours: 2 },
        { weekKey: "2024-W02", plannedHours: 3, actualHours: 4 },
      ],
    });

    const entries = await listTimeEntriesForMember(client, "member-1");

    expect(entries).toEqual([
      { weekKey: "2024-W01", plannedHours: 1, actualHours: 2 },
      { weekKey: "2024-W02", plannedHours: 3, actualHours: 4 },
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ORDER BY week_key"), ["member-1"]);
  });

  it("upserts time entry", async () => {
    query.mockResolvedValue({ rows: [] });

    await upsertTimeEntry(client, { memberId: "member-2", weekKey: "2024-W10", plannedHours: 5, actualHours: 6 });

    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO project_member_time_entries"), [
      "member-2",
      "2024-W10",
      5,
      6,
    ]);
  });
});
