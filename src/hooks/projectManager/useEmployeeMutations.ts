// Employee mutations module extracted from useWorkspaceModule
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api';
import { DEFAULT_EMPLOYEE_CAPACITY } from '../../constants';
import type { Employee, Location, Project } from '../../types';
import { locations } from '../../types';
import { generateId } from './utils';
import { sanitizeCapacity, type EmployeeUpdater, type MutationContext } from './workspaceUtils';

const CSV_CAPACITY_HEADERS = new Set([
    'kapacitet',
    'kapacitet (timer/uge)',
    'kapacitet (timer per uge)',
    'kapacitet timer/uge',
]);

const parseCapacityFromCsv = (value: string | undefined, fallback: number): number => {
    if (typeof value !== 'string') {
        return fallback;
    }
    const normalized = value.replace(',', '.').trim();
    if (normalized === '') {
        return fallback;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
};

export interface EmployeeMutationsConfig {
    projects: Project[];
    updateEmployees: (updater: EmployeeUpdater) => void;
    updateProjects: (updater: (prev: Project[]) => Project[]) => void;
    mutationContext: MutationContext;
}

export const useEmployeeMutations = (config: EmployeeMutationsConfig) => {
    const { projects, updateEmployees, updateProjects, mutationContext } = config;
    const { beginMutation, endMutation, handleMutationError, syncWorkspaceCache } = mutationContext;

    const createEmployeeMutation = useMutation({
        mutationFn: (employee: Partial<Employee> & { name: string; email: string; id?: string }) =>
            api.createEmployee(employee),
        onMutate: () => {
            beginMutation();
        },
        onSuccess: (createdEmployee) => {
            syncWorkspaceCache((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    employees: [...previous.employees.filter((e) => e.id !== createdEmployee.id), createdEmployee],
                };
            });
        },
        onError: async (error: unknown) => {
            await handleMutationError(error, 'Kunne ikke oprette medarbejderen.');
        },
        onSettled: () => {
            endMutation();
        },
    });

    const updateEmployeeMutation = useMutation({
        mutationFn: ({ employeeId, updates }: { employeeId: string; updates: Partial<Employee> }) =>
            api.updateEmployee(employeeId, updates),
        onMutate: () => {
            beginMutation();
        },
        onSuccess: (updatedEmployee) => {
            syncWorkspaceCache((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    employees: previous.employees.map((e) => (e.id === updatedEmployee.id ? updatedEmployee : e)),
                };
            });
        },
        onError: async (error: unknown) => {
            await handleMutationError(error, 'Kunne ikke opdatere medarbejderen.');
        },
        onSettled: () => {
            endMutation();
        },
    });

    const deleteEmployeeMutation = useMutation({
        mutationFn: (employeeId: string) => api.deleteEmployee(employeeId),
        onMutate: () => {
            beginMutation();
        },
        onSuccess: (_, employeeId) => {
            syncWorkspaceCache((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    employees: previous.employees.filter((e) => e.id !== employeeId),
                };
            });
        },
        onError: async (error: unknown) => {
            await handleMutationError(error, 'Kunne ikke slette medarbejderen.');
        },
        onSettled: () => {
            endMutation();
        },
    });

    const addEmployee = useCallback(
        (name: string, location: Location, email: string, maxCapacityHoursWeek: number = DEFAULT_EMPLOYEE_CAPACITY) => {
            const sanitizedCapacity = sanitizeCapacity(maxCapacityHoursWeek, DEFAULT_EMPLOYEE_CAPACITY);
            const candidateEmployee: Employee = {
                id: generateId(),
                name,
                location,
                email,
                maxCapacityHoursWeek: sanitizedCapacity,
            };

            let didCreate = false;
            updateEmployees((prev) => {
                if (prev.some((e) => e.email.toLowerCase() === email.toLowerCase())) {
                    alert('En medarbejder med denne email findes allerede.');
                    return prev;
                }
                didCreate = true;
                return [...prev, candidateEmployee];
            });

            if (!didCreate) return;

            const payload: Partial<Employee> & { name: string; email: string; id?: string } = {
                id: candidateEmployee.id,
                name: candidateEmployee.name,
                email: candidateEmployee.email,
            };
            if (candidateEmployee.location) {
                payload.location = candidateEmployee.location;
            }
            if (typeof candidateEmployee.maxCapacityHoursWeek === 'number') {
                payload.maxCapacityHoursWeek = candidateEmployee.maxCapacityHoursWeek;
            }

            createEmployeeMutation.mutate(payload);
        },
        [createEmployeeMutation, updateEmployees],
    );

    const updateEmployee = useCallback(
        (id: string, updates: Partial<Employee>) => {
            let updatesPayload: { employeeId: string; updates: Partial<Employee> } | null = null;
            updateEmployees((prev) => {
                if (
                    updates.email &&
                    prev.some((e) => e.id !== id && e.email.toLowerCase() === updates.email!.toLowerCase())
                ) {
                    alert('En anden medarbejder med denne email findes allerede.');
                    return prev;
                }

                return prev.map((employee) => {
                    if (employee.id !== id) return employee;

                    const next: Partial<Employee> = { ...updates };
                    if (next.maxCapacityHoursWeek !== undefined) {
                        next.maxCapacityHoursWeek = sanitizeCapacity(next.maxCapacityHoursWeek, employee.maxCapacityHoursWeek ?? 0);
                    }

                    const merged = { ...employee, ...next };
                    const mutationPayload: Partial<Employee> = {
                        name: merged.name,
                        email: merged.email,
                    };
                    if (merged.location) {
                        mutationPayload.location = merged.location;
                    }
                    if (merged.department !== undefined) {
                        mutationPayload.department = merged.department;
                    }
                    if (typeof merged.maxCapacityHoursWeek === 'number') {
                        mutationPayload.maxCapacityHoursWeek = merged.maxCapacityHoursWeek;
                    }

                    updatesPayload = { employeeId: id, updates: mutationPayload };
                    return merged;
                });
            });

            if (!updatesPayload) return;
            updateEmployeeMutation.mutate(updatesPayload);
        },
        [updateEmployeeMutation, updateEmployees],
    );

    const deleteEmployee = useCallback(
        (id: string) => {
            const assignedProjects = projects.filter((project) =>
                project.projectMembers.some((member) => member.employeeId === id),
            );

            if (
                assignedProjects.length > 0 &&
                !window.confirm(
                    'Denne medarbejder er tilknyttet et eller flere projekter. Vil du fjerne dem fra alle projekter og slette dem permanent?',
                )
            ) {
                return;
            }

            const assignedProjectIds = new Set(assignedProjects.map((p) => p.id));
            if (assignedProjectIds.size > 0) {
                updateProjects((prevProjects) =>
                    prevProjects.map((project) =>
                        assignedProjectIds.has(project.id)
                            ? {
                                ...project,
                                projectMembers: project.projectMembers.filter((member) => member.employeeId !== id),
                            }
                            : project,
                    ),
                );
            }

            updateEmployees((prev) => prev.filter((e) => e.id !== id));
            deleteEmployeeMutation.mutate(id);
        },
        [deleteEmployeeMutation, projects, updateEmployees, updateProjects],
    );

    const importEmployeesFromCsv = useCallback(
        (csvContent: string) => {
            const lines = csvContent.split('\n').filter((line) => line.trim() !== '');
            if (lines.length <= 1) {
                alert('CSV-filen er tom eller indeholder kun en overskriftsraekke.');
                return;
            }

            const rawHeader = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
            const normalizedHeader = rawHeader.map((h) => h.toLowerCase());
            if (normalizedHeader[0] !== 'navn' || normalizedHeader[1] !== 'lokation' || normalizedHeader[2] !== 'email') {
                alert('CSV-filen skal have kolonnerne: Navn,Lokation,Email og valgfrit Kapacitet.');
                return;
            }
            const capacityIndex = normalizedHeader.findIndex((column) => CSV_CAPACITY_HEADERS.has(column));

            const employeesToCreate: (Partial<Employee> & {
                id: string;
                name: string;
                email: string;
                location: Location;
                maxCapacityHoursWeek: number;
            })[] = [];
            const employeesToUpdatePayload: { employeeId: string; updates: Partial<Employee> }[] = [];

            updateEmployees((currentEmployees) => {
                const newEmployeesList = [...currentEmployees];
                const existingEmailMap = new Map(newEmployeesList.map((e) => [e.email.toLowerCase(), e]));
                const rows = lines.slice(1);

                let updatedCount = 0;
                let addedCount = 0;
                let skippedCount = 0;

                for (const row of rows) {
                    const cells = row.split(',').map((value) => value.trim().replace(/"/g, ''));
                    const name = cells[0] ?? '';
                    const location = cells[1] ?? '';
                    const email = cells[2] ?? '';
                    if (!name || !location || !email || !locations.includes(location as Location)) {
                        skippedCount += 1;
                        continue;
                    }

                    const normalizedLocation = location as Location;
                    const existingEmployee = existingEmailMap.get(email.toLowerCase());
                    if (existingEmployee) {
                        const index = newEmployeesList.findIndex((e) => e.id === existingEmployee.id);
                        const updatedEmployee: Employee = { ...existingEmployee, name, location: normalizedLocation };
                        if (capacityIndex >= 0) {
                            updatedEmployee.maxCapacityHoursWeek = parseCapacityFromCsv(
                                cells[capacityIndex],
                                existingEmployee.maxCapacityHoursWeek ?? DEFAULT_EMPLOYEE_CAPACITY,
                            );
                        }
                        newEmployeesList[index] = updatedEmployee;
                        const updatesForEmployee: Partial<Employee> = { name: updatedEmployee.name };
                        if (updatedEmployee.location) {
                            updatesForEmployee.location = updatedEmployee.location;
                        }
                        if (typeof updatedEmployee.maxCapacityHoursWeek === 'number') {
                            updatesForEmployee.maxCapacityHoursWeek = updatedEmployee.maxCapacityHoursWeek;
                        }
                        employeesToUpdatePayload.push({ employeeId: updatedEmployee.id, updates: updatesForEmployee });
                        updatedCount += 1;
                    } else {
                        const capacity =
                            capacityIndex >= 0
                                ? parseCapacityFromCsv(cells[capacityIndex], DEFAULT_EMPLOYEE_CAPACITY)
                                : DEFAULT_EMPLOYEE_CAPACITY;
                        const newEmployee: Employee = {
                            id: generateId(),
                            name,
                            location: normalizedLocation,
                            email,
                            maxCapacityHoursWeek: capacity,
                        };
                        newEmployeesList.push(newEmployee);
                        employeesToCreate.push({
                            id: newEmployee.id,
                            name: newEmployee.name,
                            email: newEmployee.email,
                            location: normalizedLocation,
                            maxCapacityHoursWeek: capacity,
                        });
                        addedCount += 1;
                    }
                }

                alert(
                    `Import færdig.\n- ${addedCount} nye medarbejdere tilføjet.\n- ${updatedCount} eksisterende medarbejdere opdateret.\n- ${skippedCount} rækker sprunget over pga. fejl.`,
                );

                return newEmployeesList;
            });

            employeesToCreate.forEach((payload) => {
                createEmployeeMutation.mutate(payload);
            });
            employeesToUpdatePayload.forEach((payload) => {
                updateEmployeeMutation.mutate(payload);
            });
        },
        [createEmployeeMutation, updateEmployeeMutation, updateEmployees],
    );

    return {
        addEmployee,
        updateEmployee,
        deleteEmployee,
        importEmployeesFromCsv,
        // Expose mutations for direct access if needed
        createEmployeeMutation,
        updateEmployeeMutation,
        deleteEmployeeMutation,
    };
};
