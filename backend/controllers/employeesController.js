import {
  createEmployeeRecord,
  updateEmployeeRecord,
  deleteEmployeeRecord,
} from '../services/employeeService.js';

export const createEmployee = async (req, res, next) => {
  try {
    const employee = await createEmployeeRecord(req.validatedBody ?? {}, req.user);
    res.status(201).json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.validatedParams ?? req.params ?? {};
    const employee = await updateEmployeeRecord(employeeId, req.validatedBody ?? {}, req.user);
    res.json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.validatedParams ?? req.params ?? {};
    await deleteEmployeeRecord(employeeId, req.user);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
