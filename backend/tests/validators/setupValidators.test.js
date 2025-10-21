import { describe, it, expect, vi } from "vitest";
import { validateInitialAdminPayload } from "../../validators/setupValidators.js";

const createRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe("validateInitialAdminPayload", () => {
  it("accepts valid payload", () => {
    const req = { body: { email: "admin@example.com", name: "Admin", password: "secret123" } };
    const res = createRes();
    const next = vi.fn();

    validateInitialAdminPayload(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.validatedBody).toMatchObject({ email: "admin@example.com", name: "Admin" });
  });

  it("rejects short password", () => {
    const req = { body: { email: "admin@example.com", name: "Admin", password: "123" } };
    const res = createRes();
    const next = vi.fn();

    validateInitialAdminPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid email", () => {
    const req = { body: { email: "not-an-email", name: "Admin", password: "secret123" } };
    const res = createRes();
    const next = vi.fn();

    validateInitialAdminPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
