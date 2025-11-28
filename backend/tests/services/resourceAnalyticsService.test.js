import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calcDepartmentSeries,
  calcProjectSeries,
  aggregateResourceAnalytics,
  clearResourceAnalyticsCache,
} from '../../services/resourceAnalyticsService.js';
import {
  engineeringDepartmentEmployees,
  engineeringDepartmentEntries,
  engineeringDepartmentBreakdown,
  engineeringDepartmentStackEntries,
  alphaProjectMembers,
  alphaProjectEntriesExtended,
} from '../fixtures/resourceAnalyticsFixtures.js';

describe('resourceAnalyticsService', () => {
  beforeEach(() => {
    clearResourceAnalyticsCache();
  });

  it('aggregates department data with capacity baseline and over-allocation detection', async () => {
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown })
        .mockResolvedValueOnce({ rows: engineeringDepartmentStackEntries }),
    };

    const result = await calcDepartmentSeries('Engineering', {
      range: { fromWeek: '2025-W01', toWeek: '2025-W03' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(4);
    expect(mockDb.query.mock.calls[0][1]).toEqual(['Ekstern', 'Engineering']);
    expect(mockDb.query.mock.calls[1][1]).toEqual(['Ekstern', 'Engineering', '2025-W01', '2025-W03']);
    expect(mockDb.query.mock.calls[2][1]).toEqual(['Ekstern', 'Engineering', '2025-W01', '2025-W03']);
    expect(mockDb.query.mock.calls[3][1]).toEqual(['Ekstern', 'Engineering', '2025-W01', '2025-W03']);

    expect(result.scope).toEqual({ type: 'department', id: 'Engineering' });
    expect(result.series).toEqual([
      { week: '2025-W01', capacity: 112.5, planned: 90, actual: 84 },
      { week: '2025-W02', capacity: 112.5, planned: 130, actual: 120 },
      { week: '2025-W03', capacity: 112.5, planned: 0, actual: 0 },
    ]);
    expect(result.overAllocatedWeeks).toEqual(['2025-W02']);
    expect(result.projectBreakdown).toEqual([
      {
        projectId: '5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa',
        projectName: 'Alpha',
        planned: 140,
        actual: 132,
      },
      {
        projectId: '5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb',
        projectName: 'Beta',
        planned: 80,
        actual: 72,
      },
    ]);
    expect(result.projectStackPlan).toEqual([
      {
        week: '2025-W01',
        projects: [
          { projectId: '5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa', projectName: 'Alpha', hours: 60 },
          { projectId: '5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb', projectName: 'Beta', hours: 30 },
        ],
      },
      {
        week: '2025-W02',
        projects: [
          { projectId: '5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa', projectName: 'Alpha', hours: 80 },
          { projectId: '5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb', projectName: 'Beta', hours: 50 },
        ],
      },
      {
        week: '2025-W03',
        projects: [
          { projectId: '5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa', projectName: 'Alpha', hours: 0 },
          { projectId: '5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb', projectName: 'Beta', hours: 0 },
        ],
      },
    ]);
    expect(result.projectStackActual).toEqual([
      {
        week: '2025-W01',
        projects: [
          { projectId: '5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa', projectName: 'Alpha', hours: 55 },
          { projectId: '5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb', projectName: 'Beta', hours: 29 },
        ],
      },
      {
        week: '2025-W02',
        projects: [
          { projectId: '5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa', projectName: 'Alpha', hours: 77 },
          { projectId: '5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb', projectName: 'Beta', hours: 43 },
        ],
      },
      {
        week: '2025-W03',
        projects: [
          { projectId: '5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa', projectName: 'Alpha', hours: 0 },
          { projectId: '5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb', projectName: 'Beta', hours: 0 },
        ],
      },
    ]);
    expect(result.totals).toEqual({
      capacity: 337.5,
      planned: 220,
      actual: 204,
    });
  });

  it('aggregates department data across all departments when requested', async () => {
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown })
        .mockResolvedValueOnce({ rows: engineeringDepartmentStackEntries }),
    };

    const result = await calcDepartmentSeries('__ALL__', {
      range: { fromWeek: '2025-W01', toWeek: '2025-W03' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(4);
    expect(mockDb.query.mock.calls[0][1]).toEqual(['Ekstern']);
    expect(mockDb.query.mock.calls[1][1]).toEqual(['Ekstern', '2025-W01', '2025-W03']);
    expect(mockDb.query.mock.calls[2][1]).toEqual(['Ekstern', '2025-W01', '2025-W03']);
    expect(mockDb.query.mock.calls[3][1]).toEqual(['Ekstern', '2025-W01', '2025-W03']);

    expect(result.scope).toEqual({ type: 'department', id: '__ALL__' });
    expect(result.projectBreakdown).toHaveLength(2);
    expect(result.projectStackPlan).toHaveLength(3);
    expect(result.projectStackActual).toHaveLength(3);
  });

  it('aggregates project data across ISO week-year boundaries', async () => {
    const projectId = '5ac7b3f2-318e-40ff-9c3a-222222222222';
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: projectId, name: 'Alpha' }] })
        .mockResolvedValueOnce({ rows: alphaProjectMembers })
        .mockResolvedValueOnce({ rows: alphaProjectEntriesExtended }),
    };

    const result = await calcProjectSeries(projectId, {
      range: { fromWeek: '2025-W52', toWeek: '2026-W02' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(3);
    expect(mockDb.query.mock.calls[0][1]).toEqual([projectId]);
    expect(mockDb.query.mock.calls[1][1]).toEqual([projectId, 'Ekstern']);
    expect(mockDb.query.mock.calls[2][1]).toEqual([projectId, 'Ekstern', '2025-W52', '2026-W02']);

    expect(result.scope).toEqual({ type: 'project', id: projectId });
    expect(result.series).toEqual([
      { week: '2025-W52', capacity: 70, planned: 60, actual: 58 },
      { week: '2026-W01', capacity: 70, planned: 80, actual: 92 },
      { week: '2026-W02', capacity: 70, planned: 40, actual: 36 },
    ]);
    expect(result.overAllocatedWeeks).toEqual(['2026-W01']);
    expect(result.projectBreakdown).toEqual([]);
    expect(result.projectStackPlan).toEqual([
      {
        week: '2025-W52',
        projects: [{ projectId, projectName: 'Alpha', hours: 60 }],
      },
      {
        week: '2026-W01',
        projects: [{ projectId, projectName: 'Alpha', hours: 80 }],
      },
      {
        week: '2026-W02',
        projects: [{ projectId, projectName: 'Alpha', hours: 40 }],
      },
    ]);
    expect(result.projectStackActual).toEqual([
      {
        week: '2025-W52',
        projects: [{ projectId, projectName: 'Alpha', hours: 58 }],
      },
      {
        week: '2026-W01',
        projects: [{ projectId, projectName: 'Alpha', hours: 92 }],
      },
      {
        week: '2026-W02',
        projects: [{ projectId, projectName: 'Alpha', hours: 36 }],
      },
    ]);
    expect(result.totals).toEqual({
      capacity: 210,
      planned: 180,
      actual: 186,
    });
  });

  it('throws a 404 when project does not exist', async () => {
    const projectId = '5ac7b3f2-318e-40ff-9c3a-222222222999';
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] }),
    };

    await expect(
      calcProjectSeries(projectId, {
        range: { fromWeek: '2025-W01', toWeek: '2025-W02' },
        dbClient: mockDb,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects inverted ranges', async () => {
    await expect(
      calcDepartmentSeries('Engineering', {
        range: { fromWeek: '2025-W03', toWeek: '2025-W01' },
        dbClient: { query: vi.fn() },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('delegates to the correct scope via aggregateResourceAnalytics', async () => {
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown })
        .mockResolvedValueOnce({ rows: engineeringDepartmentStackEntries })
        .mockResolvedValueOnce({ rows: [{ baseline: 150 }] }),
    };

    const result = await aggregateResourceAnalytics({
      scope: 'department',
      scopeId: 'Engineering',
      range: { fromWeek: '2025-W01', toWeek: '2025-W02' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(5);
    expect(mockDb.query.mock.calls[4][1]).toEqual(['00000000-0000-0000-0000-000000000001']);
    expect(result.scope).toEqual({ type: 'department', id: 'Engineering' });
    expect(result.series).toEqual([
      { week: '2025-W01', capacity: 112.5, planned: 90, actual: 84 },
      { week: '2025-W02', capacity: 112.5, planned: 130, actual: 120 },
    ]);
    expect(result.projectBreakdown).toHaveLength(2);
    expect(result.baselineHoursWeek).toBe(150);
    expect(result.baselineTotalHours).toBe(300);
    expect(result.totals).toEqual({
      capacity: 225,
      planned: 220,
      actual: 204,
      baseline: 300,
    });
  });

  it('aggregates all departments via aggregateResourceAnalytics when scopeId is __ALL__', async () => {
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown })
        .mockResolvedValueOnce({ rows: engineeringDepartmentStackEntries })
        .mockResolvedValueOnce({ rows: [{ baseline: 150 }] }),
    };

    const result = await aggregateResourceAnalytics({
      scope: 'department',
      scopeId: '__ALL__',
      range: { fromWeek: '2025-W01', toWeek: '2025-W02' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(5);
    expect(mockDb.query.mock.calls[0][1]).toEqual(['Ekstern']);
    expect(mockDb.query.mock.calls[1][1]).toEqual(['Ekstern', '2025-W01', '2025-W02']);
    expect(mockDb.query.mock.calls[2][1]).toEqual(['Ekstern', '2025-W01', '2025-W02']);
    expect(mockDb.query.mock.calls[3][1]).toEqual(['Ekstern', '2025-W01', '2025-W02']);
    expect(mockDb.query.mock.calls[4][1]).toEqual(['00000000-0000-0000-0000-000000000001']);

    expect(result.scope).toEqual({ type: 'department', id: '__ALL__' });
    expect(result.projectBreakdown).toHaveLength(2);
    expect(result.baselineHoursWeek).toBe(150);
  });

  it('attaches baseline data for project analytics via aggregateResourceAnalytics', async () => {
    const projectId = '5ac7b3f2-318e-40ff-9c3a-222222222222';
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: projectId, name: 'Alpha' }] })
        .mockResolvedValueOnce({ rows: alphaProjectMembers })
        .mockResolvedValueOnce({ rows: alphaProjectEntriesExtended })
        .mockResolvedValueOnce({ rows: [{ baseline: 140 }] }),
    };

    const result = await aggregateResourceAnalytics({
      scope: 'project',
      scopeId: projectId,
      range: { fromWeek: '2025-W52', toWeek: '2026-W02' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(4);
    expect(result.scope).toEqual({ type: 'project', id: projectId });
    expect(result.projectStackPlan).toHaveLength(3);
    expect(result.baselineHoursWeek).toBe(140);
    expect(result.totals.baseline).toBe(140 * 3);
  });

  it('returns cached results on repeated requests within ttl', async () => {
    const cache = new Map();
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown })
        .mockResolvedValueOnce({ rows: engineeringDepartmentStackEntries })
        .mockResolvedValueOnce({ rows: [{ baseline: 150 }] }),
    };

    const params = {
      scope: 'department',
      scopeId: 'Engineering',
      range: { fromWeek: '2025-W01', toWeek: '2025-W02' },
      dbClient: mockDb,
    };

    let currentTime = 1_000;
    const now = vi.fn(() => currentTime);

    const first = await aggregateResourceAnalytics(params, { cache, ttlMs: 10_000, now });
    expect(first.series).toHaveLength(2);
    expect(first.projectBreakdown).toHaveLength(2);
    expect(first.baselineHoursWeek).toBe(150);
    expect(mockDb.query).toHaveBeenCalledTimes(5);

    mockDb.query.mockClear();
    const second = await aggregateResourceAnalytics(params, { cache, ttlMs: 10_000, now });

    expect(second).toEqual(first);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('expires cache entries once ttl elapses', async () => {
    const cache = new Map();
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown })
        .mockResolvedValueOnce({ rows: engineeringDepartmentStackEntries })
        .mockResolvedValueOnce({ rows: [{ baseline: 150 }] })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown })
        .mockResolvedValueOnce({ rows: engineeringDepartmentStackEntries })
        .mockResolvedValueOnce({ rows: [{ baseline: 150 }] }),
    };

    const params = {
      scope: 'department',
      scopeId: 'Engineering',
      range: { fromWeek: '2025-W01', toWeek: '2025-W02' },
      dbClient: mockDb,
    };

    let currentTime = 1_000;
    const now = vi.fn(() => currentTime);

    await aggregateResourceAnalytics(params, { cache, ttlMs: 5_000, now });
    expect(mockDb.query).toHaveBeenCalledTimes(5);

    mockDb.query.mockClear();
    currentTime = 10_001;

    await aggregateResourceAnalytics(params, { cache, ttlMs: 5_000, now });
    expect(mockDb.query).toHaveBeenCalledTimes(5);
  });

  it('rejects unsupported scope types', async () => {
    await expect(
      aggregateResourceAnalytics({
        scope: 'team',
        scopeId: 'Ops',
        range: { fromWeek: '2025-W01', toWeek: '2025-W02' },
        dbClient: { query: vi.fn() },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
