/**
 * Organizations Routes
 * API endpoints for organizations and locations master data
 */

import { Router } from 'express';
import authMiddleware from '../authMiddleware.js';
import * as orgRepo from '../repositories/organizationRepository.js';

const router = Router();

/**
 * GET /api/organizations
 * List all active organizations
 */
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const organizations = await orgRepo.listOrganizations();
        res.json(organizations);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/organizations/:id
 * Get organization by ID
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
        const org = await orgRepo.findById(null, req.params.id);
        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        res.json(org);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/organizations/:id/locations
 * List locations for an organization
 */
router.get('/:id/locations', authMiddleware, async (req, res, next) => {
    try {
        const locations = await orgRepo.listLocationsByOrganization(null, req.params.id);
        res.json(locations);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/locations
 * List all locations with organization info
 */
router.get('/all/locations', authMiddleware, async (req, res, next) => {
    try {
        const locations = await orgRepo.listAllLocations();
        res.json(locations);
    } catch (error) {
        next(error);
    }
});

export default router;
