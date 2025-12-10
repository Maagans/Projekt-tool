import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

/**
 * TDD Phase 1.3: Auth Middleware Tests
 * Tests that req.user contains workspaceId from JWT token
 */
describe('authMiddleware - workspace in req.user', () => {
    let authMiddleware;
    let mockReq;
    let mockRes;
    let mockNext;
    const jwtSecret = 'test-secret';

    beforeEach(async () => {
        vi.resetModules();
        vi.doMock('../config/index.js', () => ({
            config: { jwtSecret },
        }));
        vi.doMock('../utils/cookies.js', () => ({
            AUTH_COOKIE_NAME: 'auth_token',
        }));

        const module = await import('../authMiddleware.js');
        authMiddleware = module.default;

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        mockNext = vi.fn();
    });

    it('sets req.user.workspaceId from JWT token', () => {
        const token = jwt.sign(
            {
                id: 'user-1',
                email: 'test@test.com',
                role: 'Projektleder',
                workspaceId: 'ws-1-uuid',
            },
            jwtSecret,
        );
        mockReq = { cookies: { auth_token: token } };

        authMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toHaveProperty('workspaceId');
        expect(mockReq.user.workspaceId).toBe('ws-1-uuid');
    });

    it('allows tokens without workspaceId (backwards compat)', () => {
        // Old tokens without workspaceId should still work
        const token = jwt.sign(
            {
                id: 'user-1',
                email: 'test@test.com',
                role: 'Administrator',
            },
            jwtSecret,
        );
        mockReq = { cookies: { auth_token: token } };

        authMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user.id).toBe('user-1');
        // workspaceId will be undefined for old tokens - that's OK
        expect(mockReq.user.workspaceId).toBeUndefined();
    });
});
