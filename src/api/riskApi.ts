// src/api/riskApi.ts
// Project risk management + report risk snapshots
import type { ProjectRisk, ProjectRiskFilters, ProjectRiskInput, ProjectRiskUpdateInput } from '../types';
import { fetchWithAuth } from './client';

const sanitizeRiskPayload = (risk: ProjectRiskInput | ProjectRiskUpdateInput) => {
    const payload: Record<string, unknown> = { ...risk };
    if ('probability' in payload && payload.probability !== undefined) {
        payload.probability = Number(payload.probability);
    }
    if ('impact' in payload && payload.impact !== undefined) {
        payload.impact = Number(payload.impact);
    }
    if ('ownerId' in payload && payload.ownerId === '') {
        payload.ownerId = null;
    }
    if ('lastFollowUpAt' in payload && payload.lastFollowUpAt === '') {
        payload.lastFollowUpAt = null;
    }
    if ('dueDate' in payload && payload.dueDate === '') {
        payload.dueDate = null;
    }
    if ('title' in payload && typeof payload.title === 'string') {
        payload.title = payload.title.trim();
    }
    return payload;
};

export const riskApi = {
    async getProjectRisks(projectId: string, filters: ProjectRiskFilters = {}): Promise<ProjectRisk[]> {
        if (!projectId) {
            throw new Error('projectId is required to load risks.');
        }
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.ownerId) params.set('ownerId', filters.ownerId);
        if (filters.category) params.set('category', filters.category);
        if (filters.includeArchived) params.set('includeArchived', 'true');
        if (filters.overdue) params.set('overdue', 'true');

        const query = params.toString();
        const response = await fetchWithAuth(`/api/projects/${projectId}/risks${query ? `?${query}` : ''}`);
        return (response as { risks: ProjectRisk[] }).risks;
    },

    async createProjectRisk(projectId: string, payload: ProjectRiskInput): Promise<ProjectRisk> {
        const response = await fetchWithAuth(`/api/projects/${projectId}/risks`, {
            method: 'POST',
            body: JSON.stringify(sanitizeRiskPayload(payload)),
        });
        return (response as { risk: ProjectRisk }).risk;
    },

    async updateProjectRisk(riskId: string, payload: ProjectRiskUpdateInput): Promise<ProjectRisk> {
        const response = await fetchWithAuth(`/api/risks/${riskId}`, {
            method: 'PATCH',
            body: JSON.stringify(sanitizeRiskPayload(payload)),
        });
        return (response as { risk: ProjectRisk }).risk;
    },

    async archiveProjectRisk(riskId: string): Promise<void> {
        await fetchWithAuth(`/api/risks/${riskId}`, { method: 'DELETE' });
    },

    async attachReportRisks(reportId: string, riskIds: string[]): Promise<ProjectRisk[]> {
        if (!reportId) {
            throw new Error('reportId is required to synkronisere risici.');
        }
        const response = await fetchWithAuth(`/api/reports/${reportId}/risks`, {
            method: 'POST',
            body: JSON.stringify({ riskIds }),
        });
        return (response as { snapshots: ProjectRisk[] }).snapshots;
    },

    async updateReportRiskSnapshot(
        reportId: string,
        snapshotId: string,
        payload: { probability: number; impact: number },
    ): Promise<ProjectRisk> {
        if (!reportId || !snapshotId) {
            throw new Error('reportId og snapshotId er påkrævet for at opdatere risici.');
        }
        const response = await fetchWithAuth(`/api/reports/${reportId}/risks/${snapshotId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return (response as { snapshot: ProjectRisk }).snapshot;
    },
};
