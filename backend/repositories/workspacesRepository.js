/**
 * Workspaces Repository
 * Handles database operations for workspaces
 */

import pool from '../db.js';

/**
 * List all active workspaces
 */
export const listWorkspaces = async (executor = pool) => {
    const result = await executor.query(`
    SELECT id::text, name, type, config, is_active, created_at
    FROM workspaces
    WHERE is_active = true
    ORDER BY name ASC
  `);
    return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        config: row.config ?? {},
        isActive: row.is_active,
        createdAt: row.created_at,
    }));
};

/**
 * Get workspace by ID
 */
export const findById = async (executor, id) => {
    const result = await executor.query(
        `SELECT id::text, name, type, config, is_active, created_at FROM workspaces WHERE id = $1`,
        [id],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        config: row.config ?? {},
        isActive: row.is_active,
        createdAt: row.created_at,
    };
};

/**
 * Get workspace by type
 */
export const findByType = async (executor, type) => {
    const result = await executor.query(
        `SELECT id::text, name, type, config, is_active FROM workspaces WHERE type = $1 AND is_active = true LIMIT 1`,
        [type],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        config: row.config ?? {},
        isActive: row.is_active,
    };
};

/**
 * Get default workspace (Sekretariatet)
 */
export const getDefaultWorkspace = async (executor = pool) => {
    return findByType(executor, 'sekretariat');
};

/**
 * Update workspace config
 */
export const updateConfig = async (executor, id, config) => {
    const result = await executor.query(
        `UPDATE workspaces SET config = $2 WHERE id = $1 RETURNING id::text, name, type, config`,
        [id, JSON.stringify(config)],
    );
    return result.rows[0] ?? null;
};
