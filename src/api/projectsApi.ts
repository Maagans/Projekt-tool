// src/api/projectsApi.ts
// Project CRUD + member operations + time entries
import type { Project, ProjectMember, Employee, Location } from '../types';
import { fetchWithAuth } from './client';

const sanitizeProjectPayload = (project: Partial<Project>): Partial<Project> => {
    const clone = JSON.parse(JSON.stringify(project ?? {})) as Partial<Project>;
    const mutableClone = clone as Record<string, unknown>;
    if (mutableClone && typeof mutableClone === 'object' && 'permissions' in mutableClone) {
        delete mutableClone.permissions;
    }
    return clone;
};

export const projectsApi = {
    async createProject(project: Project): Promise<Project> {
        const response = await fetchWithAuth('/api/projects', {
            method: 'POST',
            body: JSON.stringify(sanitizeProjectPayload(project)),
        });
        return (response as { project: Project }).project;
    },

    async updateProject(project: Partial<Project> & { id: string }): Promise<Project> {
        const response = await fetchWithAuth(`/api/projects/${project.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ project: sanitizeProjectPayload(project) }),
        });
        return (response as { project: Project }).project;
    },

    async deleteProject(projectId: string): Promise<void> {
        await fetchWithAuth(`/api/projects/${projectId}`, { method: 'DELETE' });
    },

    async addProjectMember(
        projectId: string,
        payload: {
            employeeId?: string;
            newEmployee?: { id?: string; name: string; email: string; location?: Location | null; department?: string | null };
            role?: string;
            group?: ProjectMember['group'];
            id?: string;
        },
    ): Promise<{ member: ProjectMember; employee?: Employee }> {
        const response = await fetchWithAuth(`/api/projects/${projectId}/members`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return response as { member: ProjectMember; employee?: Employee };
    },

    async updateProjectMember(
        projectId: string,
        memberId: string,
        updates: { role?: string; group?: ProjectMember['group']; isProjectLead?: boolean },
    ): Promise<ProjectMember> {
        const response = await fetchWithAuth(`/api/projects/${projectId}/members/${memberId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        return (response as { member: ProjectMember }).member;
    },

    async deleteProjectMember(projectId: string, memberId: string): Promise<void> {
        await fetchWithAuth(`/api/projects/${projectId}/members/${memberId}`, {
            method: 'DELETE',
        });
    },

    async logTimeEntry(
        projectId: string,
        memberId: string,
        weekKey: string,
        hours: { plannedHours?: number; actualHours?: number },
    ): Promise<{ success: boolean; member?: ProjectMember }> {
        const payload: Record<string, unknown> = { memberId, weekKey };
        if (typeof hours.plannedHours === 'number') {
            payload.plannedHours = hours.plannedHours;
        }
        if (typeof hours.actualHours === 'number') {
            payload.actualHours = hours.actualHours;
        }
        return fetchWithAuth(`/api/projects/${projectId}/time-entries`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
};
