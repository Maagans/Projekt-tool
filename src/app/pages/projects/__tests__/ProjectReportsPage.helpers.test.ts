import { describe, expect, it } from 'vitest';
import { snapshotToProjectRisk, projectRiskToReportState } from '../ProjectReportsPage';
import type { ProjectRisk, Risk } from '../../../../types';

const baseRisk: Risk = {
  id: 'snapshot-1',
  name: 'Vendor delay',
  s: 3,
  k: 4,
  projectRiskId: 'risk-1',
  description: 'Awaiting approval',
  status: 'open',
  categoryKey: 'timeline',
  ownerName: 'Alice',
  ownerEmail: 'alice@example.com',
  mitigationPlanA: null,
  mitigationPlanB: null,
  followUpNotes: null,
  followUpFrequency: null,
  dueDate: null,
  lastFollowUpAt: null,
  projectRiskArchived: false,
  projectRiskUpdatedAt: null,
};

describe('ProjectReportsPage helpers', () => {
  it('maps snapshot to ProjectRisk with owner info', () => {
    const mapped = snapshotToProjectRisk(baseRisk, 'proj-1');
    expect(mapped.owner).toEqual({
      id: 'risk-1',
      name: 'Alice',
      email: 'alice@example.com',
    });
    expect(mapped.category.key).toBe('timeline');
  });

  it('maps ProjectRisk back to report state and keeps owner info', () => {
    const projectRisk: ProjectRisk = {
      id: 'snapshot-1',
      projectId: 'proj-1',
      projectRiskId: 'risk-1',
      title: 'Vendor delay',
      description: 'Awaiting approval',
      probability: 3,
      impact: 4,
      score: 12,
      mitigationPlanA: null,
      mitigationPlanB: null,
      owner: { id: 'risk-1', name: 'Alice', email: 'alice@example.com' },
      followUpNotes: null,
      followUpFrequency: null,
      category: { key: 'timeline', label: 'Tidsplan', badge: 'emerald' },
      lastFollowUpAt: null,
      dueDate: null,
      status: 'open',
      isArchived: false,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectRiskUpdatedAt: null,
    };
    const state = projectRiskToReportState(projectRisk);
    expect(state.ownerName).toBe('Alice');
    expect(state.ownerEmail).toBe('alice@example.com');
  });
});
