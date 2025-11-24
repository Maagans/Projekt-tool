import { z } from 'zod';
import { fetchWithAuth } from '../api';

const listItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
});

const mainTableRowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['green', 'yellow', 'red']),
  note: z.string().optional().nullable(),
});

const phaseSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  start: z.number(),
  end: z.number(),
  highlight: z.string().optional().nullable(),
  workstreamId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

const milestoneSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  position: z.number(),
  date: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  workstreamId: z.string().optional().nullable(),
});

const deliverableChecklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  completed: z.boolean().optional().default(false),
});

const deliverableSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  position: z.number(),
  milestoneId: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  progress: z.number().optional().nullable(),
  checklist: z.array(deliverableChecklistItemSchema).optional().default([]),
});

const kanbanTaskSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  status: z.enum(['todo', 'doing', 'done']),
  assignee: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdAt: z.string().optional(),
});

const ownerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().optional().nullable(),
});

const riskSchema = z.object({
  id: z.string().min(1),
  projectRiskId: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  probability: z.number(),
  impact: z.number(),
  score: z.number(),
  category: z.any(),
  status: z.string().optional().nullable(),
  owner: ownerSchema.optional().nullable(),
  mitigationPlanA: z.string().optional().nullable(),
  mitigationPlanB: z.string().optional().nullable(),
  followUpNotes: z.string().optional().nullable(),
  followUpFrequency: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  lastFollowUpAt: z.string().optional().nullable(),
  isArchived: z.boolean().optional().default(false),
  projectRiskUpdatedAt: z.string().optional().nullable(),
});

const workstreamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int(),
});

const projectStateSchema = z.object({
  statusItems: z.array(listItemSchema).optional().default([]),
  challengeItems: z.array(listItemSchema).optional().default([]),
  nextStepItems: z.array(listItemSchema).optional().default([]),
  mainTableRows: z.array(mainTableRowSchema).optional().default([]),
  risks: z.array(riskSchema).optional().default([]),
  phases: z.array(phaseSchema).optional().default([]),
  milestones: z.array(milestoneSchema).optional().default([]),
  deliverables: z.array(deliverableSchema).optional().default([]),
  kanbanTasks: z.array(kanbanTaskSchema).optional().default([]),
  workstreams: z.array(workstreamSchema).optional().default([]),
});

const reportSummarySchema = z.object({
  id: z.string().min(1),
  projectId: z.string().optional().nullable(),
  weekKey: z.string().min(1),
});

const reportDetailSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().optional().nullable(),
  weekKey: z.string().min(1),
  state: projectStateSchema,
});

const listResponseSchema = z.object({
  success: z.boolean().optional(),
  reports: z.array(reportSummarySchema),
});

const reportResponseSchema = z.object({
  success: z.boolean().optional(),
  report: reportDetailSchema,
});

export type ReportSummary = z.infer<typeof reportSummarySchema>;
export type ReportState = z.infer<typeof projectStateSchema>;
export type ReportDetail = z.infer<typeof reportDetailSchema>;

export const reportApi = {
  async listReports(projectId: string): Promise<ReportSummary[]> {
    const response = await fetchWithAuth(`/api/projects/${projectId}/reports`);
    const parsed = listResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error('Ugyldigt svar fra rapport-list API.');
    }
    return parsed.data.reports;
  },

  async getReport(reportId: string): Promise<ReportDetail> {
    const response = await fetchWithAuth(`/api/reports/${reportId}`);
    const parsed = reportResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error('Ugyldigt svar fra rapport-API.');
    }
    return parsed.data.report;
  },

  async createReport(projectId: string, payload: { weekKey: string; state?: ReportState }): Promise<ReportDetail> {
    const response = await fetchWithAuth(`/api/projects/${projectId}/reports`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const parsed = reportResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error('Ugyldigt svar ved oprettelse af rapport.');
    }
    return parsed.data.report;
  },

  async updateReport(reportId: string, payload: { weekKey?: string; state?: ReportState }): Promise<ReportDetail> {
    const response = await fetchWithAuth(`/api/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const parsed = reportResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error('Ugyldigt svar ved opdatering af rapport.');
    }
    return parsed.data.report;
  },

  async deleteReport(reportId: string): Promise<void> {
    await fetchWithAuth(`/api/reports/${reportId}`, { method: 'DELETE' });
  },
};
