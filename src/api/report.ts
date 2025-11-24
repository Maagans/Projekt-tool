import { z } from 'zod';
import { fetchWithAuth } from '../api';
import {
  type ProjectState,
  type Risk,
  type MainTableRow,
  type Phase,
  type Milestone,
  type Deliverable,
  type KanbanTask,
  type ProjectRiskStatus,
  type ProjectRiskCategoryKey,
} from '../types';

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
type ApiReportState = z.infer<typeof projectStateSchema>;
type ApiRisk = z.infer<typeof riskSchema>;
export type ReportDetail = z.infer<typeof reportDetailSchema> & { state: ReportState };
export type ReportState = ProjectState;

const normalizeRisk = (risk: ApiRisk): Risk => {
  const categoryKey = (typeof risk.category === 'string'
    ? (risk.category as ProjectRiskCategoryKey)
    : (risk.category?.key as ProjectRiskCategoryKey | undefined)) ?? 'other';
  const status = (risk.status as ProjectRiskStatus | undefined) ?? 'open';
  return {
    id: risk.id,
    name: risk.title,
    s: risk.probability,
    k: risk.impact,
    projectRiskId: risk.projectRiskId ?? null,
    description: risk.description ?? null,
    status,
    categoryKey,
    ownerName: risk.owner?.name ?? null,
    ownerEmail: risk.owner?.email ?? null,
    mitigationPlanA: risk.mitigationPlanA ?? null,
    mitigationPlanB: risk.mitigationPlanB ?? null,
    followUpNotes: risk.followUpNotes ?? null,
    followUpFrequency: risk.followUpFrequency ?? null,
    dueDate: risk.dueDate ?? null,
    lastFollowUpAt: risk.lastFollowUpAt ?? null,
    projectRiskArchived: risk.isArchived ?? false,
    projectRiskUpdatedAt: risk.projectRiskUpdatedAt ?? null,
  };
};

const normalizeMainTableRows = (rows: ApiReportState['mainTableRows']): MainTableRow[] =>
  (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    note: row.note ?? '',
  }));

const normalizePhases = (phases: ApiReportState['phases']): Phase[] =>
  (phases ?? []).map((p) => ({
    id: p.id,
    text: p.text,
    start: p.start,
    end: p.end,
    highlight: p.highlight ?? '',
    workstreamId: p.workstreamId ?? null,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    status: p.status ?? null,
  }));

const normalizeMilestones = (milestones: ApiReportState['milestones']): Milestone[] =>
  (milestones ?? []).map((m) => ({
    id: m.id,
    text: m.text,
    position: m.position,
    date: m.date ?? null,
    status: m.status ?? null,
    workstreamId: m.workstreamId ?? null,
  }));

const normalizeDeliverables = (deliverables: ApiReportState['deliverables']): Deliverable[] =>
  (deliverables ?? []).map((d) => ({
    id: d.id,
    text: d.text,
    position: d.position,
    milestoneId: d.milestoneId ?? null,
    status: d.status ?? null,
    owner: d.owner ?? null,
    ownerId: d.ownerId ?? null,
    description: d.description ?? null,
    notes: d.notes ?? null,
    startDate: d.startDate ?? null,
    endDate: d.endDate ?? null,
    progress: d.progress ?? null,
    checklist: d.checklist ?? [],
  }));

const normalizeKanban = (tasks: ApiReportState['kanbanTasks']): KanbanTask[] =>
  (tasks ?? []).map((t) => ({
    id: t.id,
    content: t.content,
    status: t.status,
    assignee: t.assignee ?? null,
    dueDate: t.dueDate ?? null,
    notes: t.notes ?? null,
    createdAt: t.createdAt ?? new Date().toISOString(),
  }));

const normalizeReportState = (state: ApiReportState): ProjectState => ({
  statusItems: state.statusItems ?? [],
  challengeItems: state.challengeItems ?? [],
  nextStepItems: state.nextStepItems ?? [],
  mainTableRows: normalizeMainTableRows(state.mainTableRows),
  risks: (state.risks ?? []).map(normalizeRisk),
  phases: normalizePhases(state.phases),
  milestones: normalizeMilestones(state.milestones),
  deliverables: normalizeDeliverables(state.deliverables),
  kanbanTasks: normalizeKanban(state.kanbanTasks),
  workstreams: state.workstreams ?? [],
});

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
    return { ...parsed.data.report, state: normalizeReportState(parsed.data.report.state) };
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
    return { ...parsed.data.report, state: normalizeReportState(parsed.data.report.state) };
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
    return { ...parsed.data.report, state: normalizeReportState(parsed.data.report.state) };
  },

  async deleteReport(reportId: string): Promise<void> {
    await fetchWithAuth(`/api/reports/${reportId}`, { method: 'DELETE' });
  },
};
