import { randomUUID } from "crypto";

/**
 * Create a password reset token record.
 * @param {import('pg').PoolClient} client
 * @param {{ userId: string, tokenHash: string, expiresAt: Date }} data
 */
export const createToken = async (client, { userId, tokenHash, expiresAt }) => {
    const id = randomUUID();
    const { rows } = await client.query(
        `
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
      VALUES ($1::uuid, $2::uuid, $3, $4)
      RETURNING id::text, user_id::text AS user_id, expires_at, created_at
    `,
        [id, userId, tokenHash, expiresAt],
    );
    return rows[0] ?? null;
};

/**
 * Find a valid (unexpired, unused) token by its hash.
 * @param {import('pg').PoolClient} client
 * @param {string} tokenHash
 */
export const findValidToken = async (client, tokenHash) => {
    const { rows } = await client.query(
        `
      SELECT
        prt.id::text,
        prt.user_id::text AS user_id,
        prt.expires_at,
        prt.used_at,
        prt.created_at,
        u.auth_provider
      FROM password_reset_tokens prt
      JOIN users u ON u.id = prt.user_id
      WHERE prt.token_hash = $1
        AND prt.expires_at > NOW()
        AND prt.used_at IS NULL
      LIMIT 1
    `,
        [tokenHash],
    );
    return rows[0] ?? null;
};

/**
 * Mark a token as used.
 * @param {import('pg').PoolClient} client
 * @param {string} tokenId
 */
export const markTokenUsed = async (client, tokenId) => {
    const { rowCount } = await client.query(
        `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE id = $1::uuid AND used_at IS NULL
    `,
        [tokenId],
    );
    return rowCount > 0;
};

/**
 * Delete all expired tokens (cleanup).
 * @param {import('pg').PoolClient} client
 */
export const deleteExpiredTokens = async (client) => {
    const { rowCount } = await client.query(
        `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`,
    );
    return rowCount;
};

/**
 * Invalidate all unused tokens for a user (e.g., after password change).
 * @param {import('pg').PoolClient} client
 * @param {string} userId
 */
export const invalidateUserTokens = async (client, userId) => {
    const { rowCount } = await client.query(
        `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE user_id = $1::uuid AND used_at IS NULL
    `,
        [userId],
    );
    return rowCount;
};
