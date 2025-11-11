import { describe, expect, it, vi } from "vitest";
import { up, down } from "../../migrations/20251112120000_create_project_risks.js";

const createMockPgm = () => ({
  createType: vi.fn(),
  dropType: vi.fn(),
  createTable: vi.fn(),
  dropTable: vi.fn(),
  addConstraint: vi.fn(),
  createIndex: vi.fn(),
  dropIndex: vi.fn(),
  func: vi.fn((expression) => ({ __raw: expression })),
});

describe("20251112120000_create_project_risks migration", () => {
  it("creates tables, constraints and indexes", () => {
    const pgm = createMockPgm();
    up(pgm);

    expect(pgm.createType).toHaveBeenCalledWith(
      "project_risk_category",
      expect.arrayContaining(["technical", "other"]),
    );
    expect(pgm.createType).toHaveBeenCalledWith(
      "project_risk_status",
      expect.arrayContaining(["open", "closed"]),
    );
    expect(pgm.createTable).toHaveBeenCalledWith(
      "project_risks",
      expect.objectContaining({
        project_id: expect.objectContaining({ references: "projects" }),
        category: expect.objectContaining({ type: "project_risk_category" }),
      }),
    );
    expect(pgm.createTable).toHaveBeenCalledWith(
      "project_risk_history",
      expect.objectContaining({
        project_risk_id: expect.objectContaining({ references: "project_risks" }),
      }),
    );
    expect(pgm.createIndex).toHaveBeenCalledWith("project_risks", "project_id");
  });

  it("drops tables and types on down", () => {
    const pgm = createMockPgm();
    down(pgm);
    expect(pgm.dropTable).toHaveBeenCalledWith("project_risk_history", { ifExists: true });
    expect(pgm.dropTable).toHaveBeenCalledWith("project_risks", { ifExists: true });
    expect(pgm.dropType).toHaveBeenCalledWith("project_risk_status", { ifExists: true });
    expect(pgm.dropType).toHaveBeenCalledWith("project_risk_category", { ifExists: true });
  });
});
