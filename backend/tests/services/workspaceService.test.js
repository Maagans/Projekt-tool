import { describe, it, expect, vi } from 'vitest';
import { loadFullWorkspace, resolveDepartmentLocation, applyWorkspacePermissions } from '../../services/workspaceService.js';

describe('workspaceService.loadFullWorkspace', () => {
  it('maps database rows into workspace structure', async () => {
    const mockExecutor = {
      query: vi.fn(async (sql) => {
        const text = sql.toString();

        if (text.includes('FROM workspace_settings')) {
          return {
            rows: [{ baseline: 135 }],
          };
        }

        if (text.includes('FROM employees')) {
          return {
            rows: [
              {
                id: 'b54d8b63-02c1-4bf5-9c17-111111111111',
                name: 'Alice Anderson',
                email: 'alice@example.com',
                location: 'København',
                max_capacity_hours_week: 37.5,
                azure_ad_id: null,
                department: 'IT',
                job_title: 'Udvikler',
                account_enabled: true,
                synced_at: null,
              },
            ],
          };
        }

        if (text.includes('FROM projects')) {
          return {
            rows: [
              {
                id: '5ac7b3f2-318e-40ff-9c3a-222222222222',
                name: 'Apollo',
                start_date: new Date('2025-01-01'),
                end_date: new Date('2025-06-30'),
                status: 'active',
                description: 'Strategisk initiativ',
              },
            ],
          };
        }

        if (text.includes('FROM project_members')) {
          return {
            rows: [
              {
                id: '77777777-aaaa-4bbb-cccc-333333333333',
                project_id: '5ac7b3f2-318e-40ff-9c3a-222222222222',
                employee_id: 'b54d8b63-02c1-4bf5-9c17-111111111111',
                role: 'Projektleder',
                member_group: 'kerne',
                is_project_lead: true,
              },
            ],
          };
        }

        if (text.includes('FROM project_member_time_entries')) {
          return {
            rows: [
              {
                member_id: '77777777-aaaa-4bbb-cccc-333333333333',
                week_key: '2025-W02',
                planned_hours: 12,
                actual_hours: 10,
              },
              {
                member_id: '77777777-aaaa-4bbb-cccc-333333333333',
                week_key: '2025-W01',
                planned_hours: 10,
                actual_hours: 8,
              },
            ],
          };
        }

        if (text.includes('FROM reports')) {
          return {
            rows: [
              {
                id: '99999999-bbbb-4444-cccc-555555555555',
                project_id: '5ac7b3f2-318e-40ff-9c3a-222222222222',
                week_key: '2025-W02',
              },
            ],
          };
        }

        // Remaining report* tables
        return { rows: [] };
      }),
    };

    const workspace = await loadFullWorkspace(mockExecutor);

    expect(mockExecutor.query).toHaveBeenCalled();
    expect(workspace.employees).toHaveLength(1);
    expect(workspace.projects).toHaveLength(1);
    expect(workspace.settings).toEqual({ pmoBaselineHoursWeek: 135 });

    const [employee] = workspace.employees;
    expect(employee).toMatchObject({
      id: 'b54d8b63-02c1-4bf5-9c17-111111111111',
      name: 'Alice Anderson',
      maxCapacityHoursWeek: 37.5,
    });
    expect(employee.department).toBe(employee.location);

    const [project] = workspace.projects;
    expect(project.config.projectName).toBe('Apollo');
    expect(project.projectMembers).toHaveLength(1);
    expect(project.projectMembers[0].timeEntries.map((entry) => entry.weekKey)).toEqual([
      '2025-W01',
      '2025-W02',
    ]);
    expect(project.reports).toHaveLength(1);
  });
});

describe('resolveDepartmentLocation', () => {
  it('prefers the location value and mirrors department', () => {
    const result = resolveDepartmentLocation({ location: 'Sano Aarhus', department: 'IT' });
    expect(result).toEqual({
      canonical: 'Sano Aarhus',
      location: 'Sano Aarhus',
      department: 'Sano Aarhus',
    });
  });

  it('falls back to department when location is missing or blank', () => {
    const result = resolveDepartmentLocation({ location: '   ', department: 'Sekretariatet' });
    expect(result).toEqual({
      canonical: 'Sekretariatet',
      location: 'Sekretariatet',
      department: 'Sekretariatet',
    });
  });
});

describe('applyWorkspacePermissions', () => {
  it('retains workspace settings and sanitizes baseline', () => {
    const workspace = {
      projects: [],
      employees: [],
      settings: { pmoBaselineHoursWeek: -25 },
    };
    const user = { role: 'Administrator', employeeId: null };
    const result = applyWorkspacePermissions(workspace, user);
    expect(result.settings).toEqual({ pmoBaselineHoursWeek: 0 });
  });
});
