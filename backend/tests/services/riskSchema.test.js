import { describe, expect, it } from "vitest";
import {
  PROJECT_RISK_CATEGORY_DEFINITIONS,
  PROJECT_RISK_CATEGORY_KEYS,
  assertRiskScale,
  buildCategoryMeta,
  calculateRiskScore,
  normalizeRiskCategory,
} from "../../services/risk/riskSchema.js";

describe("riskSchema helpers", () => {
  it("normalizes category keys and falls back to other", () => {
    expect(normalizeRiskCategory(" TECHNICAL ")).toBe("technical");
    expect(normalizeRiskCategory("unknown-category")).toBe("other");
    expect(normalizeRiskCategory(undefined)).toBe("other");
  });

  it("builds category meta with labels and badges", () => {
    const meta = buildCategoryMeta("timeline");
    expect(meta).toEqual({
      key: "timeline",
      ...PROJECT_RISK_CATEGORY_DEFINITIONS.timeline,
    });
  });

  it("assertRiskScale enforces range 1..5", () => {
    expect(assertRiskScale(3, "probability")).toBe(3);
    expect(() => assertRiskScale(7, "probability")).toThrow(/between 1 and 5/);
    expect(() => assertRiskScale("abc", "impact")).toThrow(/between 1 and 5/);
  });

  it("calculates composite score and clamps to 25", () => {
    expect(calculateRiskScore(2, 4)).toBe(8);
    expect(calculateRiskScore(5, 5)).toBe(25);
  });

  it("keeps category definition list in sync", () => {
    expect(PROJECT_RISK_CATEGORY_KEYS).toContain("technical");
    expect(PROJECT_RISK_CATEGORY_KEYS).toContain("other");
  });
});
