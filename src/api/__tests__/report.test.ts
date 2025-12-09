import { describe, expect, it, vi, beforeEach, type MockedFunction } from 'vitest';
import { reportApi } from '../reportApi';

vi.mock('../../api', () => ({
  fetchWithAuth: vi.fn(),
}));

const { fetchWithAuth } = await import('../../api');
const mockedFetch = fetchWithAuth as MockedFunction<typeof fetchWithAuth>;

describe('reportApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parses report list', async () => {
    mockedFetch.mockResolvedValue({
      success: true,
      reports: [{ id: 'r1', projectId: 'p1', weekKey: '2024-W05' }],
    });

    const reports = await reportApi.listReports('p1');
    expect(reports).toEqual([{ id: 'r1', projectId: 'p1', weekKey: '2024-W05' }]);
  });

  it('parses report detail with defaults', async () => {
    mockedFetch.mockResolvedValue({
      success: true,
      report: {
        id: 'r1',
        projectId: 'p1',
        weekKey: '2024-W05',
        state: {
          statusItems: [],
          risks: [],
          phases: [],
          milestones: [],
          deliverables: [],
          kanbanTasks: [],
          workstreams: [],
        },
      },
    });

    const report = await reportApi.getReport('r1');
    expect(report.id).toBe('r1');
    expect(report.state.workstreams).toEqual([]);
    expect(report.state.mainTableRows).toEqual([]);
  });
});
