import pool from "../db.js";
import logger from "../logger.js";

export const withTransaction = async (callback, { client: externalClient } = {}) => {
  const client = externalClient ?? await pool.connect();
  const shouldRelease = !externalClient;

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      logger.error({ err: rollbackError }, "Transaction rollback failed");
    }
    throw error;
  } finally {
    if (shouldRelease) {
      client.release();
    }
  }
};
