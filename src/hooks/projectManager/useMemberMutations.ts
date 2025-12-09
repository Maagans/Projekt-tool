// Member mutations module extracted from useWorkspaceModule
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api';
import type { Employee, Location, Project, ProjectMember } from '../../types';
import { locations } from '../../types';
import { generateId } from './utils';
import { type EmployeeUpdater, type MutationContext, type ProjectUpdater } from './workspaceUtils';

export type AddProjectMemberInput = {
    projectId: string;
    member: {
        employeeId?: string;
        newEmployee?: { id?: string; name: string; email: string; location?: Location | null; department?: string | null };
        role?: string;
        group?: ProjectMember['group'];
        id?: string;
    };
};

export type AssignMemberInput = {
    employeeId?: string;
    role?: string;
    group?: ProjectMember['group'];
    newEmployee?: { id?: string; name: string; email: string; location?: Location | null; department?: string | null };
};

export interface MemberMutationsConfig {
    projects: Project[];
    employees: Employee[];
    updateProjects: (updater: ProjectUpdater) => void;
    updateEmployees: (updater: EmployeeUpdater) => void;
    mutationContext: MutationContext;
}

export const useMemberMutations = (config: MemberMutationsConfig) => {
    const { projects, employees, updateProjects, updateEmployees, mutationContext } = config;
    const { beginMutation, endMutation, handleMutationError, syncWorkspaceCache } = mutationContext;

    const createProjectMemberMutation = useMutation({
        mutationFn: (variables: AddProjectMemberInput) => api.addProjectMember(variables.projectId, variables.member),
        onMutate: () => {
            beginMutation();
        },
        onSuccess: (payload, variables) => {
            const { member, employee } = payload;
            syncWorkspaceCache((previous) => {
                if (!previous) return previous;
                const nextEmployees = employee
                    ? [
                        ...previous.employees.filter((e) => e.id !== employee.id),
                        { ...employee, maxCapacityHoursWeek: employee.maxCapacityHoursWeek ?? 0 },
                    ]
                    : previous.employees;
                return {
                    ...previous,
                    employees: nextEmployees,
                    projects: previous.projects.map((project) =>
                        project.id === variables.projectId
                            ? {
                                ...project,
                                projectMembers: [...project.projectMembers.filter((m) => m.id !== member.id), member],
                            }
                            : project,
                    ),
                };
            });
        },
        onError: async (error: unknown) => {
            await handleMutationError(error, 'Kunne ikke tilføje projektmedlemmet.');
        },
        onSettled: () => {
            endMutation();
        },
    });

    const patchProjectMemberMutation = useMutation({
        mutationFn: (variables: {
            projectId: string;
            memberId: string;
            updates: { role?: string; group?: ProjectMember['group']; isProjectLead?: boolean };
        }) => api.updateProjectMember(variables.projectId, variables.memberId, variables.updates),
        onMutate: () => {
            beginMutation();
        },
        onSuccess: (updatedMember, variables) => {
            syncWorkspaceCache((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    projects: previous.projects.map((project) =>
                        project.id === variables.projectId
                            ? {
                                ...project,
                                projectMembers: project.projectMembers.map((member) =>
                                    member.id === updatedMember.id ? { ...member, ...updatedMember } : member,
                                ),
                            }
                            : project,
                    ),
                };
            });
        },
        onError: async (error: unknown) => {
            await handleMutationError(error, 'Kunne ikke opdatere projektmedlemmet.');
        },
        onSettled: () => {
            endMutation();
        },
    });

    const deleteProjectMemberMutation = useMutation({
        mutationFn: ({ projectId, memberId }: { projectId: string; memberId: string }) =>
            api.deleteProjectMember(projectId, memberId),
        onMutate: () => {
            beginMutation();
        },
        onSuccess: (_, variables) => {
            syncWorkspaceCache((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    projects: previous.projects.map((project) =>
                        project.id === variables.projectId
                            ? {
                                ...project,
                                projectMembers: project.projectMembers.filter((m) => m.id !== variables.memberId),
                            }
                            : project,
                    ),
                };
            });
        },
        onError: async (error: unknown) => {
            await handleMutationError(error, 'Kunne ikke fjerne projektmedlemmet.');
        },
        onSettled: () => {
            endMutation();
        },
    });

    // High-level member actions
    const assignEmployeeToProject = useCallback(
        (projectId: string, input: AssignMemberInput | string, role?: string, group?: ProjectMember['group']) => {
            const normalizedInput: AssignMemberInput =
                typeof input === 'string'
                    ? {
                        employeeId: input,
                        ...(role ? { role } : {}),
                        ...(group ? { group } : {}),
                    }
                    : input;

            const project = projects.find((p) => p.id === projectId);
            if (!project) return;

            const trimmedName = normalizedInput.newEmployee?.name?.trim() ?? '';
            const trimmedEmail = normalizedInput.newEmployee?.email?.trim() ?? '';

            let employeeId = normalizedInput.employeeId;
            if (!employeeId && normalizedInput.newEmployee) {
                if (!trimmedName || !trimmedEmail) {
                    alert('Navn og email er påkrævet for eksterne medlemmer.');
                    return;
                }
                const existingByEmail = employees.find((emp) => emp.email.toLowerCase() === trimmedEmail.toLowerCase());
                employeeId = existingByEmail?.id ?? normalizedInput.newEmployee.id ?? generateId();
                if (!existingByEmail) {
                    const locationValue: Location = (normalizedInput.newEmployee?.location ?? locations[0]) as Location;
                    updateEmployees((prev) => [
                        ...prev,
                        {
                            id: employeeId!,
                            name: trimmedName,
                            email: trimmedEmail,
                            location: locationValue,
                            department: normalizedInput.newEmployee?.department ?? 'Ekstern',
                            maxCapacityHoursWeek: 0,
                        },
                    ]);
                }
            }

            if (!employeeId) {
                alert('Vælg en medarbejder eller angiv navn og email.');
                return;
            }

            if (project.projectMembers.some((member) => member.employeeId === employeeId)) {
                alert('Medarbejderen er allerede tilknyttet projektet.');
                return;
            }

            const newMember: ProjectMember = {
                id: generateId(),
                employeeId,
                role: normalizedInput.role ?? 'Ny rolle',
                group: normalizedInput.group ?? 'unassigned',
                timeEntries: [],
                isProjectLead: false,
            };

            updateProjects((prevProjects) =>
                prevProjects.map((p) =>
                    p.id === projectId ? { ...p, projectMembers: [...p.projectMembers, newMember] } : p,
                ),
            );

            const memberPayload: AddProjectMemberInput['member'] = {
                employeeId: newMember.employeeId,
                role: newMember.role,
                group: newMember.group,
                id: newMember.id,
            };

            if (normalizedInput.newEmployee && !employees.some((e) => e.id === employeeId)) {
                memberPayload.newEmployee = {
                    id: employeeId,
                    name: trimmedName,
                    email: trimmedEmail,
                    location: normalizedInput.newEmployee.location ?? null,
                    department: normalizedInput.newEmployee.department ?? 'Ekstern',
                };
            }

            createProjectMemberMutation.mutate({ projectId, member: memberPayload });
        },
        [createProjectMemberMutation, employees, projects, updateEmployees, updateProjects],
    );

    const updateMemberRole = useCallback(
        (projectId: string, memberId: string, role: string) => {
            updateProjects((prevProjects) =>
                prevProjects.map((project) =>
                    project.id === projectId
                        ? {
                            ...project,
                            projectMembers: project.projectMembers.map((member) =>
                                member.id === memberId ? { ...member, role } : member,
                            ),
                        }
                        : project,
                ),
            );
            patchProjectMemberMutation.mutate({ projectId, memberId, updates: { role } });
        },
        [patchProjectMemberMutation, updateProjects],
    );

    const updateMemberGroup = useCallback(
        (projectId: string, memberId: string, group: ProjectMember['group']) => {
            updateProjects((prevProjects) =>
                prevProjects.map((project) =>
                    project.id === projectId
                        ? {
                            ...project,
                            projectMembers: project.projectMembers.map((member) =>
                                member.id === memberId ? { ...member, group } : member,
                            ),
                        }
                        : project,
                ),
            );
            patchProjectMemberMutation.mutate({ projectId, memberId, updates: { group } });
        },
        [patchProjectMemberMutation, updateProjects],
    );

    const setProjectLead = useCallback(
        (projectId: string, memberId: string, isProjectLead: boolean) => {
            updateProjects((prevProjects) =>
                prevProjects.map((project) => {
                    if (project.id !== projectId) return project;
                    return {
                        ...project,
                        projectMembers: project.projectMembers.map((member) => {
                            if (member.id === memberId) {
                                return { ...member, isProjectLead };
                            }
                            // Only one lead allowed - unset others when setting new lead
                            if (isProjectLead && member.isProjectLead) {
                                return { ...member, isProjectLead: false };
                            }
                            return member;
                        }),
                    };
                }),
            );
            patchProjectMemberMutation.mutate({ projectId, memberId, updates: { isProjectLead } });
        },
        [patchProjectMemberMutation, updateProjects],
    );

    const removeEmployeeFromProject = useCallback(
        (projectId: string, memberId: string) => {
            updateProjects((prevProjects) =>
                prevProjects.map((project) =>
                    project.id === projectId
                        ? { ...project, projectMembers: project.projectMembers.filter((m) => m.id !== memberId) }
                        : project,
                ),
            );
            deleteProjectMemberMutation.mutate({ projectId, memberId });
        },
        [deleteProjectMemberMutation, updateProjects],
    );

    return {
        // Mutations
        createProjectMemberMutation,
        patchProjectMemberMutation,
        deleteProjectMemberMutation,
        // High-level actions
        assignEmployeeToProject,
        updateMemberRole,
        updateMemberGroup,
        setProjectLead,
        removeEmployeeFromProject,
    };
};
