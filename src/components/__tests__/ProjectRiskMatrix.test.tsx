import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectRiskMatrix } from '../ProjectRiskMatrix';
import type { ProjectRisk } from '../../types';

const risks: ProjectRisk[] = [
  {
    id: 'risk-1',
    projectId: 'proj-1',
    projectRiskId: 'risk-1',
    title: 'Delay',
    description: null,
    probability: 2,
    impact: 4,
    score: 8,
    mitigationPlanA: null,
    mitigationPlanB: null,
    owner: null,
    followUpNotes: null,
    followUpFrequency: null,
    category: { key: 'timeline', label: 'Tidsplan', badge: 'bg-emerald-100 text-emerald-700' },
    lastFollowUpAt: null,
    dueDate: null,
    status: 'open',
    isArchived: false,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectRiskUpdatedAt: null,
  },
];

describe('ProjectRiskMatrix', () => {
  it('renders risks and handles selection', () => {
    const onSelectRisk = vi.fn();
    render(
      <ProjectRiskMatrix
        risks={risks}
        selectedRiskId={null}
        onSelectRisk={onSelectRisk}
        onMoveRisk={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Delay/i }));
    expect(onSelectRisk).toHaveBeenCalledWith('risk-1');
  });

  it('updates positions when clicking grid cells', () => {
    const onMoveRisk = vi.fn();
    render(
      <ProjectRiskMatrix
        risks={risks}
        selectedRiskId="risk-1"
        onSelectRisk={vi.fn()}
        onMoveRisk={onMoveRisk}
      />,
    );

    const targetCell = screen.getAllByRole('gridcell')[0];
    fireEvent.click(targetCell);
    expect(onMoveRisk).toHaveBeenCalled();
  });

  it('shows archived badge with timestamp meta', () => {
    const archivedRisk: ProjectRisk = {
      ...risks[0],
      id: 'risk-arch',
      isArchived: true,
      projectRiskUpdatedAt: '2025-01-10T12:00:00.000Z',
    };
    render(
      <ProjectRiskMatrix
        risks={[archivedRisk]}
        selectedRiskId={null}
        onSelectRisk={vi.fn()}
        onMoveRisk={vi.fn()}
      />,
    );

    expect(screen.getByText(/Arkiveret siden/i)).toBeInTheDocument();
  });
});
