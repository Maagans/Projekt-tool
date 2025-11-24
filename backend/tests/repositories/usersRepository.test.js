import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findByEmail,
  findById,
  existsByEmail,
  countAdmins,
  create,
} from "../../repositories/usersRepository.js";

const query = vi.fn();
const client = { query };

describe("usersRepository", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("finds user by email", async () => {
    query.mockResolvedValue({ rows: [{ id: "u1", email: "a@b.c" }] });
    const user = await findByEmail(client, "a@b.c");
    expect(user?.id).toBe("u1");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM users"), ["a@b.c"]);
  });

  it("finds user by id", async () => {
    query.mockResolvedValue({ rows: [{ id: "u2", email: "c@d.e" }] });
    const user = await findById(client, "u2");
    expect(user?.email).toBe("c@d.e");
  });

  it("checks existence by email", async () => {
    query.mockResolvedValue({ rowCount: 1 });
    const exists = await existsByEmail(client, "x@y.z");
    expect(exists).toBe(true);
  });

  it("counts admins", async () => {
    query.mockResolvedValue({ rows: [{ admin_count: 2 }] });
    const count = await countAdmins(client);
    expect(count).toBe(2);
  });

  it("creates user", async () => {
    query.mockResolvedValue({ rows: [{ id: "u3", email: "e@f.g" }] });
    const created = await create(client, { id: "u3", name: "Test", email: "e@f.g", passwordHash: "h", role: "Teammedlem", employeeId: null });
    expect(created?.id).toBe("u3");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO users"), [
      "u3",
      "Test",
      "e@f.g",
      "h",
      "Teammedlem",
      null,
    ]);
  });
});
