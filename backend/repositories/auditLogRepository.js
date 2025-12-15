/**
 * Audit Log Repository
 * Handles database operations for audit logs
 */

import pool from '../db.js';

/**
 * Insert a new audit log entry
 */
export const insertAuditLog = async (executor = pool, {
    userId,
    userName,
    userRole,
    workspaceId,
    action,
    entityType,
    entityId,
    entityName,
    description,
    ipAddress
}) => {
    const result = await executor.query(
        `INSERT INTO audit_logs (
      user_id, user_name, user_role, workspace_id,
      action, entity_type, entity_id, entity_name, description, ip_address
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, created_at`,
        [
            userId || null,
            userName,
            userRole,
            workspaceId || null,
            action,
            entityType,
            entityId || null,
            entityName || null,
            description,
            ipAddress || null
        ]
    );
    return result.rows[0];
};

/**
 * Get audit logs with filters and pagination
 */
export const getAuditLogs = async (executor = pool, {
    workspaceId,
    userId,
    action,
    entityType,
    startDate,
    endDate,
    limit = 50,
    offset = 0
}) => {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (workspaceId) {
        conditions.push(`workspace_id = $${paramIndex++}`);
        params.push(workspaceId);
    }

    if (userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
    }

    if (action) {
        conditions.push(`action = $${paramIndex++}`);
        params.push(action);
    }

    if (entityType) {
        conditions.push(`entity_type = $${paramIndex++}`);
        params.push(entityType);
    }

    if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
    }

    if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await executor.query(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const result = await executor.query(
        `SELECT 
      id, created_at, user_id, user_name, user_role, workspace_id,
      action, entity_type, entity_id, entity_name, description, ip_address
    FROM audit_logs 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );

    return {
        logs: result.rows,
        total,
        limit,
        offset
    };
};

/**
 * Delete logs older than specified weeks (for retention cleanup)
 */
export const deleteOldLogs = async (executor = pool, weeksToKeep = 26) => {
    const result = await executor.query(
        `DELETE FROM audit_logs 
     WHERE created_at < NOW() - INTERVAL '${weeksToKeep} weeks'
     RETURNING id`
    );
    return result.rowCount;
};

/**
 * Get distinct users for filter dropdown
 */
export const getDistinctUsers = async (executor = pool, workspaceId) => {
    const result = await executor.query(
        `SELECT DISTINCT user_id, user_name 
     FROM audit_logs 
     WHERE workspace_id = $1 OR workspace_id IS NULL
     ORDER BY user_name`,
        [workspaceId]
    );
    return result.rows;
};
