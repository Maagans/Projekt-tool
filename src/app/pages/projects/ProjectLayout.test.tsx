import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../components/AppHeader', () => ({
  AppHeader: ({ children }: { children?: ReactNode }) => <div data-testid="app-header">{children}</div>,
}));

vi.mock('../../../hooks/useProjectManager', () => ({
  useProjectManager: vi.fn(),
}));

import { useProjectManager } from '../../../hooks/useProjectManager';
import { ProjectLayout } from './ProjectLayout';

const mockUseProjectManager = useProjectManager as unknown as Mock;

const baseProject = {
  id: 'proj-1',
  status: 'active',
  config: {
    projectName: 'Apollo',
    projectStartDate: '2025-01-01',
    projectEndDate: '2025-12-31',
  },
  projectMembers: [],
  reports: [],
  permissions: { canEdit: true, canLogTime: true },
};

const createProjectManagerValue = (overrides: Record<string, unknown> = {}) => ({
  logout: vi.fn(),
  currentUser: { id: 'user-1', name: 'Admin', email: 'admin@example.com', role: 'Administrator' },
  isSaving: false,
  isWorkspaceFetching: false,
  apiError: null,
  canManage: true,
  getProjectById: vi.fn(() => baseProject),
  projects: [baseProject],
  ...overrides,
});

const renderLayout = (initialEntry = '/projects/proj-1') => {
  mockUseProjectManager.mockReturnValue(createProjectManagerValue());
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectLayout />}>
          <Route index element={<div data-testid="overview-content">Overview content</div>} />
          <Route path="reports" element={<div data-testid="reports-content">Reports content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProjectLayout', () => {
  beforeEach(() => {
    mockUseProjectManager.mockReset();
  });

  it('viser overblik som landing og navigerer til rapporter via tab', () => {
    renderLayout();

    expect(screen.getByTestId('overview-content')).toBeInTheDocument();
    expect(screen.queryByTestId('reports-content')).toBeNull();
    expect(screen.queryByRole('button', { name: /Eksport/i })).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: 'Rapporter' }));

    expect(screen.getByTestId('reports-content')).toBeInTheDocument();
    expect(screen.queryByTestId('overview-content')).toBeNull();
    expect(screen.getByRole('button', { name: /Eksport/i })).toBeInTheDocument();
  });
});
