import { describe, it, expect } from "vitest";
import { persistWorkspace } from "../../services/workspaceService.js";

describe("workspaceService", () => {
    it("persistWorkspace is disabled and throws 410", async () => {
        await expect(persistWorkspace()).rejects.toThrowError(/Workspace persistence is disabled/);
    });
});
