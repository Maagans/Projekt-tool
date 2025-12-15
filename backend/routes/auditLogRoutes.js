/**
 * Audit Log Routes
 * Admin-only routes for viewing audit logs
 */

import express from 'express';
import authMiddleware from '../authMiddleware.js';
import requireCsrf from '../csrfMiddleware.js';
import * as auditLogController from '../controllers/auditLogController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/admin/audit-logs - List logs with filters
router.get('/', auditLogController.getAuditLogs);

// GET /api/admin/audit-logs/export - CSV export
router.get('/export', auditLogController.exportAuditLogs);

// GET /api/admin/audit-logs/users - Get distinct users for filter
router.get('/users', auditLogController.getAuditLogUsers);

// POST /api/admin/audit-logs/cleanup - Manual cleanup
router.post('/cleanup', requireCsrf, auditLogController.cleanupAuditLogs);

export default router;
