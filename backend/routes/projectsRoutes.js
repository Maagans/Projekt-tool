import { Router } from "express";
import authMiddleware from "../authMiddleware.js";
import requireCsrf from "../csrfMiddleware.js";
import { validateTimeEntryRequest } from "../validators/timeEntryValidators.js";
import {
  validateCreateProject,
  validateUpdateProject,
  validateDeleteProject,
  validateAddProjectMember,
  validateUpdateProjectMember,
  validateProjectMemberIdentifier,
} from '../validators/projectValidators.js';
import {
  createProject,
  updateProject,
  deleteProject,
  updateTimeEntries,
  addProjectMember,
  updateProjectMember,
  deleteProjectMember,
} from "../controllers/projectsController.js";

const router = Router();

router.post('/', authMiddleware, requireCsrf, validateCreateProject, createProject);
router.patch('/:projectId', authMiddleware, requireCsrf, validateUpdateProject, updateProject);
router.delete('/:projectId', authMiddleware, requireCsrf, validateDeleteProject, deleteProject);
router.post('/:projectId/members', authMiddleware, requireCsrf, validateAddProjectMember, addProjectMember);
router.patch(
  '/:projectId/members/:memberId',
  authMiddleware,
  requireCsrf,
  validateUpdateProjectMember,
  updateProjectMember,
);
router.delete(
  '/:projectId/members/:memberId',
  authMiddleware,
  requireCsrf,
  validateProjectMemberIdentifier,
  deleteProjectMember,
);
router.post('/:projectId/time-entries', authMiddleware, requireCsrf, validateTimeEntryRequest, updateTimeEntries);

export default router;
