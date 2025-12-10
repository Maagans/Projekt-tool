import { randomUUID } from "crypto";

export const findByEmail = async (client, email) => {
  const { rows } = await client.query(
    `
      SELECT
        id::text,
        name,
        email,
        role,
        password_hash,
        employee_id::text AS employee_id,
        workspace_id::text AS workspace_id,
        auth_provider
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  );
  return rows[0] ?? null;
};

export const findById = async (client, userId) => {
  const { rows } = await client.query(
    `
      SELECT
        id::text,
        name,
        email,
        role,
        password_hash,
        employee_id::text AS employee_id,
        workspace_id::text AS workspace_id,
        auth_provider
      FROM users
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [userId],
  );
  return rows[0] ?? null;
};

export const existsByEmail = async (client, email) => {
  const result = await client.query(
    `SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  return result.rowCount > 0;
};

export const countAdmins = async (client) => {
  const result = await client.query(
    `SELECT COUNT(*)::int AS admin_count FROM users WHERE role = 'Administrator'`,
  );
  return result.rows[0]?.admin_count ?? 0;
};

export const create = async (client, { id, name, email, passwordHash, role, employeeId }) => {
  const userId = id ?? randomUUID();
  const { rows } = await client.query(
    `
      INSERT INTO users (id, name, email, password_hash, role, employee_id)
      VALUES ($1::uuid, $2, LOWER($3), $4, $5, $6::uuid)
      RETURNING id::text, name, email, role, employee_id::text AS employee_id
    `,
    [userId, name, email, passwordHash, role, employeeId ?? null],
  );
  return rows[0] ?? null;
};

/**
 * Update password hash for a user.
 * @param {import('pg').PoolClient} client
 * @param {string} userId
 * @param {string} passwordHash
 */
export const updatePasswordHash = async (client, userId, passwordHash) => {
  const { rowCount } = await client.query(
    `UPDATE users SET password_hash = $2 WHERE id = $1::uuid`,
    [userId, passwordHash],
  );
  return rowCount > 0;
};
