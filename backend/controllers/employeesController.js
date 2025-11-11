import { mutateWorkspace } from '../services/workspaceMutator.js';

const normalizeEmail = (email) => email?.trim().toLowerCase() ?? '';

export const createEmployee = async (req, res, next) => {
  try {
    const { name, email, location, department, maxCapacityHoursWeek, id } = req.validatedBody;
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = name.trim();

    const { workspace, result: createdId } = await mutateWorkspace(req.user, (draft, _current, helpers) => {
      if (!Array.isArray(draft.employees)) {
        draft.employees = [];
      }

      if (draft.employees.some((employee) => normalizeEmail(employee.email) === normalizedEmail)) {
        const error = new Error('Employee with this email already exists.');
        error.statusCode = 409;
        throw error;
      }

      const employeeId = id ?? helpers.randomUUID();

      draft.employees.push({
        id: employeeId,
        name: trimmedName,
        email: normalizedEmail,
        location: location ?? '',
        department: department ?? null,
        maxCapacityHoursWeek: maxCapacityHoursWeek ?? 0,
        azureAdId: null,
        jobTitle: null,
        accountEnabled: true,
        syncedAt: null,
      });

      return employeeId;
    });

    const employee = workspace.employees.find((candidate) => candidate.id === createdId) ?? null;
    res.status(201).json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.validatedParams ?? req.params ?? {};
    const updates = req.validatedBody ?? {};
    const normalizedEmail = updates.email ? normalizeEmail(updates.email) : null;

    const { workspace } = await mutateWorkspace(req.user, (draft) => {
      const employees = Array.isArray(draft.employees) ? draft.employees : [];
      const target = employees.find((employee) => employee.id === employeeId);
      if (!target) {
        const error = new Error('Employee not found.');
        error.statusCode = 404;
        throw error;
      }

      if (normalizedEmail) {
        const duplicate = employees.find(
          (employee) => employee.id !== employeeId && normalizeEmail(employee.email) === normalizedEmail,
        );
        if (duplicate) {
          const error = new Error('Another employee already uses this email.');
          error.statusCode = 409;
          throw error;
        }
        target.email = normalizedEmail;
      }

      if (updates.name) {
        target.name = updates.name.trim();
      }

      if (updates.location !== undefined) {
        target.location = updates.location ?? '';
      }

      if (updates.department !== undefined) {
        target.department = updates.department ?? null;
      }

      if (updates.maxCapacityHoursWeek !== undefined) {
        target.maxCapacityHoursWeek = updates.maxCapacityHoursWeek;
      }

      if (updates.jobTitle !== undefined) {
        target.jobTitle = updates.jobTitle ?? null;
      }

      if (updates.accountEnabled !== undefined) {
        target.accountEnabled = Boolean(updates.accountEnabled);
      }

      if (updates.syncedAt !== undefined) {
        target.syncedAt = updates.syncedAt ?? null;
      }
    });

    const employee = workspace.employees.find((candidate) => candidate.id === employeeId) ?? null;
    res.json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.validatedParams ?? req.params ?? {};

    await mutateWorkspace(req.user, (draft) => {
      const employees = Array.isArray(draft.employees) ? draft.employees : [];
      const existingIndex = employees.findIndex((employee) => employee.id === employeeId);
      if (existingIndex === -1) {
        const error = new Error('Employee not found.');
        error.statusCode = 404;
        throw error;
      }
      employees.splice(existingIndex, 1);

      if (Array.isArray(draft.projects)) {
        draft.projects = draft.projects.map((project) => ({
          ...project,
          projectMembers: Array.isArray(project.projectMembers)
            ? project.projectMembers.filter((member) => member.employeeId !== employeeId)
            : [],
        }));
      }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
