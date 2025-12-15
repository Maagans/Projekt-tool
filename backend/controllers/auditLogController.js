/**
 * Audit Log Controller
 * Handles HTTP requests for audit log operations
 */

import * as auditLogService from '../services/auditLogService.js';
import { createAppError } from '../utils/errors.js';

/**
 * GET /api/admin/audit-logs
 * List audit logs with filters and pagination
 */
export const getAuditLogs = async (req, res, next) => {
    try {
        const { role } = req.user;

        // Only admins can view audit logs
        if (role !== 'Administrator') {
            throw createAppError('Forbidden: Admin access required', 403);
        }

        const {
            userId,
            action,
            entityType,
            startDate,
            endDate,
            limit = 100,
            offset = 0
        } = req.query;

        // Admins see all logs across all workspaces (no workspaceId filter)
        const result = await auditLogService.getAuditLogs({
            userId,
            action,
            entityType,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: Math.min(parseInt(limit, 10) || 100, 200),
            offset: parseInt(offset, 10) || 0
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/admin/audit-logs/export
 * Export audit logs as CSV
 */
export const exportAuditLogs = async (req, res, next) => {
    try {
        const { role } = req.user;

        if (role !== 'Administrator') {
            throw createAppError('Forbidden: Admin access required', 403);
        }

        const {
            userId,
            action,
            entityType,
            startDate,
            endDate
        } = req.query;

        // Get all logs (no pagination for export)
        const result = await auditLogService.getAuditLogs({
            userId,
            action,
            entityType,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: 10000 // Max export limit
        });

        const formattedLogs = auditLogService.formatLogsForExport(result.logs);

        // Generate CSV
        if (formattedLogs.length === 0) {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
            return res.send('Ingen data');
        }

        const headers = Object.keys(formattedLogs[0]);
        const csvRows = [
            headers.join(';'),
            ...formattedLogs.map(row =>
                headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(';')
            )
        ];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=audit-log-${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csvRows.join('\n')); // BOM for Excel UTF-8
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/admin/audit-logs/users
 * Get distinct users for filter dropdown
 */
export const getAuditLogUsers = async (req, res, next) => {
    try {
        const { role, workspaceId } = req.user;

        if (role !== 'Administrator') {
            throw createAppError('Forbidden: Admin access required', 403);
        }

        const users = await auditLogService.getDistinctUsers(workspaceId);
        res.json(users);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/admin/audit-logs/cleanup
 * Manually trigger cleanup of old logs (admin only)
 */
export const cleanupAuditLogs = async (req, res, next) => {
    try {
        const { role } = req.user;

        if (role !== 'Administrator') {
            throw createAppError('Forbidden: Admin access required', 403);
        }

        const deletedCount = await auditLogService.cleanupOldLogs();
        res.json({ success: true, deletedCount });
    } catch (error) {
        next(error);
    }
};
