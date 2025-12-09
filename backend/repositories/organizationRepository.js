/**
 * Organization Repository
 * Handles database operations for organizations and locations
 */

import pool from '../db.js';

/**
 * List all active organizations
 */
export const listOrganizations = async (executor = pool) => {
    const result = await executor.query(`
    SELECT id::text, name, code, is_active, created_at
    FROM organizations
    WHERE is_active = true
    ORDER BY name ASC
  `);
    return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        isActive: row.is_active,
        createdAt: row.created_at,
    }));
};

/**
 * Get organization by ID
 */
export const findById = async (executor, id) => {
    const result = await executor.query(
        `SELECT id::text, name, code, is_active, created_at FROM organizations WHERE id = $1`,
        [id],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        code: row.code,
        isActive: row.is_active,
        createdAt: row.created_at,
    };
};

/**
 * List locations for an organization
 */
export const listLocationsByOrganization = async (executor, organizationId) => {
    const result = await executor.query(
        `
    SELECT id::text, organization_id::text, name, code, is_active, created_at
    FROM locations
    WHERE organization_id = $1 AND is_active = true
    ORDER BY name ASC
    `,
        [organizationId],
    );
    return result.rows.map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        code: row.code,
        isActive: row.is_active,
        createdAt: row.created_at,
    }));
};

/**
 * List all locations with organization info
 */
export const listAllLocations = async (executor = pool) => {
    const result = await executor.query(`
    SELECT 
      l.id::text, 
      l.organization_id::text, 
      l.name, 
      l.code, 
      l.is_active,
      o.name AS organization_name,
      o.code AS organization_code
    FROM locations l
    JOIN organizations o ON l.organization_id = o.id
    WHERE l.is_active = true AND o.is_active = true
    ORDER BY o.name ASC, l.name ASC
  `);
    return result.rows.map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        code: row.code,
        isActive: row.is_active,
        organizationName: row.organization_name,
        organizationCode: row.organization_code,
        // Formatted display name: "Sano - Aarhus"
        displayName: `${row.organization_name} - ${row.name}`,
    }));
};

/**
 * Get location by ID
 */
export const findLocationById = async (executor, id) => {
    const result = await executor.query(
        `SELECT id::text, organization_id::text, name, code, is_active FROM locations WHERE id = $1`,
        [id],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        code: row.code,
        isActive: row.is_active,
    };
};

/**
 * Create organization
 */
export const createOrganization = async (executor, data) => {
    const result = await executor.query(
        `INSERT INTO organizations (name, code) VALUES ($1, $2) RETURNING id::text, name, code`,
        [data.name, data.code],
    );
    return result.rows[0];
};

/**
 * Create location
 */
export const createLocation = async (executor, data) => {
    const result = await executor.query(
        `INSERT INTO locations (organization_id, name, code) VALUES ($1, $2, $3) RETURNING id::text, organization_id::text, name, code`,
        [data.organizationId, data.name, data.code],
    );
    return result.rows[0];
};
