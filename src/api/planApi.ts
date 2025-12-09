import { z } from 'zod';
import { fetchWithAuth } from '../api';

const checklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  completed: z.boolean().optional().default(false),
});

const deliverableSchema = z.object({
  id: z.string().min(1),
  milestoneId: z.string().optional().nullable(),
  label: z.string().min(1),
  position: z.number().nullable().optional(),
  status: z.string().optional().nullable(),
  ownerName: z.string().optional().nullable(),
  ownerEmployeeId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  progress: z.number().optional().nullable(),
  checklist: z.array(checklistItemSchema).optional().default([]),
});

const milestoneSchema = z.object({
  id: z.string().min(1),
  workstreamId: z.string().optional().nullable(),
  label: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  position: z.number().nullable().optional(),
  status: z.string().optional().nullable(),
});

const phaseSchema = z.object({
  id: z.string().min(1),
  workstreamId: z.string().optional().nullable(),
  label: z.string().min(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  startPercentage: z.number().nullable().optional(),
  endPercentage: z.number().nullable().optional(),
  highlight: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

const snapshotSchema = z.object({
  projectId: z.string().min(1),
  generatedAt: z.string(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  phases: z.array(phaseSchema),
  milestones: z.array(milestoneSchema),
  deliverables: z.array(deliverableSchema),
});

export type PlanPhase = z.infer<typeof phaseSchema>;
export type PlanMilestone = z.infer<typeof milestoneSchema>;
export type PlanDeliverable = z.infer<typeof deliverableSchema>;
export type PlanSnapshot = z.infer<typeof snapshotSchema>;

export const planApi = {
  async getSnapshot(projectId: string): Promise<PlanSnapshot> {
    const res = await fetchWithAuth(`/api/projects/${projectId}/plan/snapshot`) as { snapshot?: unknown };
    const parsed = snapshotSchema.safeParse(res.snapshot ?? res);
    if (!parsed.success) {
      throw new Error('Invalid snapshot response');
    }
    return parsed.data;
  },

  async savePlan(projectId: string, payload: { phases: PlanPhase[]; milestones: PlanMilestone[]; deliverables: PlanDeliverable[] }) {
    const res = await fetchWithAuth(`/api/projects/${projectId}/plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res;
  },
};
