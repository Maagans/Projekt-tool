import { describe, it, expect, vi } from "vitest";
import { validateUserRoleChange } from "../../validators/usersValidators.js";

const createRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
};

describe("validateUserRoleChange", () => {
  it("allows valid payload", () => {
    const req = {
      params: { id: "9b67d8c9-52ab-47c6-9e88-8b491a4fbc1f" },
      body: { role: "Projektleder" },
    };
    const res = createRes();
    const next = vi.fn();

    validateUserRoleChange(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.validatedParams.id).toBe(req.params.id);
    expect(req.validatedBody.role).toBe("Projektleder");
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects invalid role", () => {
    const req = {
      params: { id: "9b67d8c9-52ab-47c6-9e88-8b491a4fbc1f" },
      body: { role: "Intern" },
    };
    const res = createRes();
    const next = vi.fn();

    validateUserRoleChange(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid uuid", () => {
    const req = {
      params: { id: "not-a-uuid" },
      body: { role: "Administrator" },
    };
    const res = createRes();
    const next = vi.fn();

    validateUserRoleChange(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
