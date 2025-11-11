import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../constants', () => ({ PROJECT_RISK_ANALYSIS_ENABLED: true }));

vi.mock('./ProjectLayout', () => ({
  useProjectRouteContext: vi.fn(),
}));

vi.mock('../../../hooks/useProjectRisks', () => ({
  useProjectRisks: vi.fn(),
}));

import { useProjectRouteContext } from './ProjectLayout';
import { useProjectRisks } from '../../../hooks/useProjectRisks';
import { ProjectRisksPage } from './ProjectRisksPage';

const mockRouteContext = useProjectRouteContext as unknown as Mock;
const mockUseProjectRisks = useProjectRisks as unknown as Mock;

const baseRisk = {
  id: 'risk-1',
  projectId: 'proj-1',
  title: 'Vendor delay',
  description: 'Afventer godkendelse fra leverandør.',
  probability: 3,
  impact: 4,
  score: 12,
  mitigationPlanA: 'Følg op hver uge',
  mitigationPlanB: 'Skift leverandør',
  owner: { id: 'emp-1', name: 'Alice', email: 'alice@example.com' },
  followUpNotes: 'Mødet planlagt',
  followUpFrequency: 'Ugentligt',
  category: { key: 'timeline', label: 'Tidsplan', badge: 'bg-emerald-100 text-emerald-700' },
  lastFollowUpAt: '2025-11-01T10:00:00.000Z',
  dueDate: '2025-11-15',
  status: 'open',
  isArchived: false,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2025-10-30T10:00:00.000Z',
  updatedAt: '2025-11-02T12:00:00.000Z',
};

const createRouteContext = (overrides: Record<string, unknown> = {}) => ({
  project: {
    id: 'proj-1',
    config: { projectName: 'Apollo', projectStartDate: '2025-01-01', projectEndDate: '2025-12-31' },
    reports: [],
  },
  projectManager: {
    canManage: true,
    employees: [{ id: 'emp-1', name: 'Alice', department: 'IT' }],
    logout: vi.fn(),
    currentUser: { id: 'user-1', name: 'Admin', email: 'admin@example.com', role: 'Administrator' },
    isSaving: false,
    apiError: null,
    ...overrides,
  },
});

const createRiskHookValue = (overrides: Record<string, unknown> = {}) => ({
  risks: [baseRisk],
  isLoading: false,
  isFetching: false,
  error: null,
  createRisk: vi.fn().mockResolvedValue(undefined),
  updateRisk: vi.fn().mockResolvedValue(undefined),
  archiveRisk: vi.fn().mockResolvedValue(undefined),
  isMutating: false,
  ...overrides,
});

const renderPage = () => render(<ProjectRisksPage />);

describe('ProjectRisksPage', () => {
  beforeEach(() => {
    mockRouteContext.mockReset();
    mockUseProjectRisks.mockReset();
    mockRouteContext.mockReturnValue(createRouteContext());
    mockUseProjectRisks.mockReturnValue(createRiskHookValue());
  });

  it('renders risk list and allows creating new risks', async () => {
    const hookValue = createRiskHookValue();
    mockUseProjectRisks.mockReturnValue(hookValue);

    renderPage();

    expect(screen.getByText('Risikovurdering')).toBeInTheDocument();
    expect(screen.getAllByText('Vendor delay').length).toBeGreaterThan(0);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ny risiko' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ny risiko' }));
    const titleInput = screen.getByLabelText('Titel') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Ny risiko' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gem risiko' }));

    await waitFor(() => expect(hookValue.createRisk).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ny risiko' })));
  });

  it('hides creation controls when user cannot manage project', () => {
    mockRouteContext.mockReturnValue(createRouteContext({ canManage: false }));

    renderPage();

    expect(screen.queryByRole('button', { name: 'Ny risiko' })).toBeNull();
  });
});
