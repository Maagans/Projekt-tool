/**
 * Audit Log Service
 * Business logic for audit logging
 */

import logger from '../logger.js';
import * as auditLogRepository from '../repositories/auditLogRepository.js';

/**
 * Log an action to the audit log
 * @param {Object} client - Database client (for transaction support)
 * @param {Object} params - Log parameters
 */
export const logAction = async (client, {
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
    try {
        const result = await auditLogRepository.insertAuditLog(client, {
            userId,
            userName: userName || 'Unknown',
            userRole: userRole || 'Unknown',
            workspaceId,
            action,
            entityType,
            entityId,
            entityName,
            description,
            ipAddress
        });

        logger.debug({ action, entityType, entityId }, 'Audit log created');
        return result;
    } catch (error) {
        // Don't fail the main operation if logging fails
        logger.error({ err: error, action, entityType }, 'Failed to create audit log');
        return null;
    }
};

/**
 * Get audit logs with filters
 */
export const getAuditLogs = async (filters) => {
    return auditLogRepository.getAuditLogs(undefined, filters);
};

/**
 * Get distinct users for filter dropdown
 */
export const getDistinctUsers = async (workspaceId) => {
    return auditLogRepository.getDistinctUsers(undefined, workspaceId);
};

/**
 * Cleanup old logs (run daily via cron or on server start)
 * Deletes logs older than 26 weeks
 */
export const cleanupOldLogs = async () => {
    const RETENTION_WEEKS = 26;
    try {
        const deletedCount = await auditLogRepository.deleteOldLogs(undefined, RETENTION_WEEKS);
        if (deletedCount > 0) {
            logger.info({ deletedCount, retentionWeeks: RETENTION_WEEKS }, 'Cleaned up old audit logs');
        }
        return deletedCount;
    } catch (error) {
        logger.error({ err: error }, 'Failed to cleanup old audit logs');
        throw error;
    }
};

/**
 * Format logs for CSV export
 */
export const formatLogsForExport = (logs) => {
    return logs.map(log => ({
        Tidspunkt: new Date(log.created_at).toLocaleString('da-DK'),
        Bruger: log.user_name,
        Rolle: log.user_role,
        Handling: log.action,
        Type: log.entity_type,
        Beskrivelse: log.description,
        'Entity ID': log.entity_id || '',
        'IP-adresse': log.ip_address || ''
    }));
};
