import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock pool
const mockQuery = vi.fn();
vi.mock('../../db.js', () => ({
    default: { query: mockQuery },
}));

// Mock config
vi.mock('../../config/index.js', () => ({
    config: { jwtSecret: 'test-secret' },
}));

// Mock logger
vi.mock('../../logger.js', () => ({
    default: { warn: vi.fn(), info: vi.fn() },
}));

// Mock cookies
vi.mock('../../utils/cookies.js', () => ({
    generateCsrfToken: vi.fn(() => 'csrf_token'),
}));

// Mock workspaceService
vi.mock('../../services/workspaceService.js', () => ({
    ensureEmployeeLinkForUser: vi.fn((_, user) => Promise.resolve(user)),
}));

// Mock userRepository - return workspace_id
vi.mock('../../repositories/userRepository.js', () => ({
    findByEmail: vi.fn(),
}));

// Mock password comparison
vi.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

/**
 * TDD Phase 1.3: User-Workspace Assignment Tests
 */
describe('authService - workspace assignment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('login', () => {
        it('returns user.workspaceId in response', async () => {
            const { findByEmail } = await import('../../repositories/userRepository.js');
            findByEmail.mockResolvedValue({
                id: 'user-1',
                email: 'test@test.com',
                name: 'Test User',
                role: 'Projektleder',
                password_hash: 'hashed',
                employee_id: 'emp-1',
                workspace_id: 'ws-1-uuid',
            });

            const { login } = await import('../../services/authService.js');
            const result = await login('test@test.com', 'Password123!');

            expect(result.user).toHaveProperty('workspaceId');
            expect(result.user.workspaceId).toBe('ws-1-uuid');
        });

        it('includes workspaceId in JWT payload', async () => {
            const { findByEmail } = await import('../../repositories/userRepository.js');
            findByEmail.mockResolvedValue({
                id: 'user-1',
                email: 'test@test.com',
                name: 'Test User',
                role: 'Projektleder',
                password_hash: 'hashed',
                employee_id: 'emp-1',
                workspace_id: 'ws-1-uuid',
            });

            const { login } = await import('../../services/authService.js');
            const result = await login('test@test.com', 'Password123!');

            const decoded = jwt.verify(result.token, 'test-secret');
            expect(decoded).toHaveProperty('workspaceId');
            expect(decoded.workspaceId).toBe('ws-1-uuid');
        });

        it('handles null workspaceId gracefully', async () => {
            const { findByEmail } = await import('../../repositories/userRepository.js');
            findByEmail.mockResolvedValue({
                id: 'user-1',
                email: 'test@test.com',
                name: 'Test User',
                role: 'Projektleder',
                password_hash: 'hashed',
                employee_id: 'emp-1',
                workspace_id: null,
            });

            const { login } = await import('../../services/authService.js');
            const result = await login('test@test.com', 'Password123!');

            expect(result.user.workspaceId).toBe(null);
        });
    });
});
