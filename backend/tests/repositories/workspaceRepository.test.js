import { describe, it, expect, vi } from 'vitest';
import * as workspaceRepository from '../../repositories/workspaceRepository.js';

/**
 * TDD Phase 1.2: Workspace filtering tests
 * These tests ensure repository functions filter by workspace_id
 */

describe('workspaceRepository - workspace filtering', () => {
    const createMockExecutor = (...responses) => {
        const query = vi.fn(async () => {
            if (!responses.length) return { rows: [] };
            return responses.shift();
        });
        return { query };
    };

    describe('loadEmployees', () => {
        it('filters employees by workspace_id when provided', async () => {
            const workspaceId = 'ws-1-uuid';
            const mockExecutor = createMockExecutor({
                rows: [
                    { id: 'emp-1', name: 'Alice', email: 'alice@example.com', location: 'Aarhus' },
                ],
            });

            const result = await workspaceRepository.loadEmployees(mockExecutor, workspaceId);

            // Verify SQL includes workspace_id filter
            expect(mockExecutor.query).toHaveBeenCalledTimes(1);
            const sqlQuery = mockExecutor.query.mock.calls[0][0];
            expect(sqlQuery).toContain('workspace_id');
            expect(mockExecutor.query.mock.calls[0][1]).toContain(workspaceId);
            expect(result).toHaveLength(1);
        });

        it('returns all employees when workspaceId is not provided (backwards compat)', async () => {
            const mockExecutor = createMockExecutor({
                rows: [
                    { id: 'emp-1', name: 'Alice' },
                    { id: 'emp-2', name: 'Bob' },
                ],
            });

            const result = await workspaceRepository.loadEmployees(mockExecutor);

            expect(result).toHaveLength(2);
            // SQL should NOT have workspace filter when undefined
            const sqlQuery = mockExecutor.query.mock.calls[0][0];
            expect(sqlQuery).not.toContain('$1');
        });
    });

    describe('loadProjects', () => {
        it('filters projects by workspace_id when provided', async () => {
            const workspaceId = 'ws-1-uuid';
            const mockExecutor = createMockExecutor({
                rows: [
                    {
                        id: 'proj-1',
                        name: 'Project A',
                        start_date: new Date('2024-01-01'),
                        end_date: new Date('2024-06-01'),
                        status: 'active',
                    },
                ],
            });

            const result = await workspaceRepository.loadProjects(mockExecutor, workspaceId);

            // Verify SQL includes workspace_id filter
            expect(mockExecutor.query).toHaveBeenCalledTimes(1);
            const sqlQuery = mockExecutor.query.mock.calls[0][0];
            expect(sqlQuery).toContain('workspace_id');
            expect(mockExecutor.query.mock.calls[0][1]).toContain(workspaceId);
            expect(result).toHaveLength(1);
        });

        it('returns all projects when workspaceId is not provided (backwards compat)', async () => {
            const mockExecutor = createMockExecutor({
                rows: [
                    { id: 'proj-1', name: 'A', start_date: new Date(), end_date: new Date(), status: 'active' },
                    { id: 'proj-2', name: 'B', start_date: new Date(), end_date: new Date(), status: 'hold' },
                ],
            });

            const result = await workspaceRepository.loadProjects(mockExecutor);

            expect(result).toHaveLength(2);
        });
    });
});
