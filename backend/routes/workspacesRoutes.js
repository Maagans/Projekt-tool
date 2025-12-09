/**
 * Workspaces Routes
 * API endpoints for workspace management
 */

import { Router } from 'express';
import authMiddleware from '../authMiddleware.js';
import * as workspacesRepo from '../repositories/workspacesRepository.js';

const router = Router();

/**
 * GET /api/workspaces
 * List all active workspaces
 */
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const workspaces = await workspacesRepo.listWorkspaces();
        res.json(workspaces);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/workspaces/:id
 * Get workspace by ID
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
        const workspace = await workspacesRepo.findById(null, req.params.id);
        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found' });
        }
        res.json(workspace);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/workspaces/current
 * Get current user's workspace
 */
router.get('/current/info', authMiddleware, async (req, res, next) => {
    try {
        const workspaceId = req.user?.workspaceId;
        if (!workspaceId) {
            // Return default workspace if user has none assigned
            const defaultWs = await workspacesRepo.getDefaultWorkspace();
            return res.json(defaultWs);
        }
        const workspace = await workspacesRepo.findById(null, workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found' });
        }
        res.json(workspace);
    } catch (error) {
        next(error);
    }
});

export default router;
