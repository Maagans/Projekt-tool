
import { render, screen } from '@testing-library/react';
import { MilestonePlan } from '../MilestonePlan';
import { Project, ProjectStatus } from '../../../types/milestone-plan';
import { describe, it, expect, vi } from 'vitest';

const mockProject: Project = {
    id: 'p1',
    name: 'Test Project',
    department: 'IT',
    status: ProjectStatus.ON_TRACK,
    manager: 'John Doe',
    risks: [],
    description: 'A test project',
    phases: [
        { id: 'ph1', name: 'Phase 1', startDate: '2024-01-01', endDate: '2024-02-01', status: 'Active' }
    ],
    workstreams: [
        { id: 'ws1', name: 'Workstream 1' }
    ],
    milestones: [
        { id: 'm1', title: 'Milestone 1', date: '2024-01-15', status: 'Pending', workstream: 'Workstream 1', deliverables: [] }
    ],
    startDate: '2024-01-01',
    endDate: '2024-12-31'
};

describe('MilestonePlan', () => {
    it('renders project title and phases', () => {
        render(
            <MilestonePlan
                project={mockProject}
                onSavePhase={vi.fn()}
                onDeletePhase={vi.fn()}
                onSaveMilestone={vi.fn()}
                onDeleteMilestone={vi.fn()}
                onSaveDeliverable={vi.fn()}
                onDeleteDeliverable={vi.fn()}
                onSaveWorkstream={vi.fn()}
                onDeleteWorkstream={vi.fn()}
            />
        );

        expect(screen.getByText('Projekt Tidsplan')).toBeInTheDocument();
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
        expect(screen.getByText('Workstream 1')).toBeInTheDocument();
    });
});
