import { Router } from 'express';
import authMiddleware from '../authMiddleware.js';
import requireCsrf from '../csrfMiddleware.js';
import { createEmployee, updateEmployee, deleteEmployee } from '../controllers/employeesController.js';
import {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateEmployeeIdentifier,
} from '../validators/employeeValidators.js';

const router = Router();

router.post('/', authMiddleware, requireCsrf, validateCreateEmployee, createEmployee);
router.patch('/:employeeId', authMiddleware, requireCsrf, validateUpdateEmployee, updateEmployee);
router.delete('/:employeeId', authMiddleware, requireCsrf, validateEmployeeIdentifier, deleteEmployee);

export default router;
