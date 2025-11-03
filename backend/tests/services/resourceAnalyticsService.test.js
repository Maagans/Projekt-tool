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
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown }),
    };

    const result = await calcDepartmentSeries('Engineering', {
      range: { fromWeek: '2025-W01', toWeek: '2025-W03' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(3);
    expect(mockDb.query.mock.calls[0][1]).toEqual(['Engineering']);
    expect(mockDb.query.mock.calls[1][1]).toEqual(['Engineering', '2025-W01', '2025-W03']);
    expect(mockDb.query.mock.calls[2][1]).toEqual(['Engineering', '2025-W01', '2025-W03']);

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
  });

  it('aggregates department data across all departments when requested', async () => {
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown }),
    };

    const result = await calcDepartmentSeries('__ALL__', {
      range: { fromWeek: '2025-W01', toWeek: '2025-W03' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(3);
    expect(mockDb.query.mock.calls[0][1]).toEqual([]);
    expect(mockDb.query.mock.calls[1][1]).toEqual(['2025-W01', '2025-W03']);
    expect(mockDb.query.mock.calls[2][1]).toEqual(['2025-W01', '2025-W03']);

    expect(result.scope).toEqual({ type: 'department', id: '__ALL__' });
    expect(result.projectBreakdown).toHaveLength(2);
  });

  it('aggregates project data across ISO week-year boundaries', async () => {
    const projectId = '5ac7b3f2-318e-40ff-9c3a-222222222222';
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: projectId }] })
        .mockResolvedValueOnce({ rows: alphaProjectMembers })
        .mockResolvedValueOnce({ rows: alphaProjectEntriesExtended }),
    };

    const result = await calcProjectSeries(projectId, {
      range: { fromWeek: '2025-W52', toWeek: '2026-W02' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(3);
    expect(mockDb.query.mock.calls[0][1]).toEqual([projectId]);
    expect(mockDb.query.mock.calls[1][1]).toEqual([projectId]);
    expect(mockDb.query.mock.calls[2][1]).toEqual([projectId, '2025-W52', '2026-W02']);

    expect(result.scope).toEqual({ type: 'project', id: projectId });
    expect(result.series).toEqual([
      { week: '2025-W52', capacity: 70, planned: 60, actual: 58 },
      { week: '2026-W01', capacity: 70, planned: 80, actual: 92 },
      { week: '2026-W02', capacity: 70, planned: 40, actual: 36 },
    ]);
    expect(result.overAllocatedWeeks).toEqual(['2026-W01']);
    expect(result.projectBreakdown).toEqual([]);
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
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown }),
    };

    const result = await aggregateResourceAnalytics({
      scope: 'department',
      scopeId: 'Engineering',
      range: { fromWeek: '2025-W01', toWeek: '2025-W02' },
      dbClient: mockDb,
    });

    expect(result.scope).toEqual({ type: 'department', id: 'Engineering' });
    expect(result.series).toEqual([
      { week: '2025-W01', capacity: 112.5, planned: 90, actual: 84 },
      { week: '2025-W02', capacity: 112.5, planned: 130, actual: 120 },
    ]);
    expect(result.projectBreakdown).toHaveLength(2);
  });

  it('aggregates all departments via aggregateResourceAnalytics when scopeId is __ALL__', async () => {
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown }),
    };

    const result = await aggregateResourceAnalytics({
      scope: 'department',
      scopeId: '__ALL__',
      range: { fromWeek: '2025-W01', toWeek: '2025-W02' },
      dbClient: mockDb,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(3);
    expect(mockDb.query.mock.calls[0][1]).toEqual([]);
    expect(mockDb.query.mock.calls[1][1]).toEqual(['2025-W01', '2025-W02']);
    expect(mockDb.query.mock.calls[2][1]).toEqual(['2025-W01', '2025-W02']);

    expect(result.scope).toEqual({ type: 'department', id: '__ALL__' });
    expect(result.projectBreakdown).toHaveLength(2);
  });

  it('returns cached results on repeated requests within ttl', async () => {
    const cache = new Map();
    const mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown }),
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
    expect(mockDb.query).toHaveBeenCalledTimes(3);

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
        .mockResolvedValueOnce({ rows: engineeringDepartmentEmployees })
        .mockResolvedValueOnce({ rows: engineeringDepartmentEntries })
        .mockResolvedValueOnce({ rows: engineeringDepartmentBreakdown }),
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
    expect(mockDb.query).toHaveBeenCalledTimes(3);

    mockDb.query.mockClear();
    currentTime = 10_001;

    await aggregateResourceAnalytics(params, { cache, ttlMs: 5_000, now });
    expect(mockDb.query).toHaveBeenCalledTimes(3);
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
