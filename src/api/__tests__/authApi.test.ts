import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { authApi } from '../authApi';
import { AUTH_USER_STORAGE_KEY } from '../client';

// Mock the client module
vi.mock('../client', async () => {
    const actual = await vi.importActual('../client');
    return {
        ...actual,
        fetchWithAuth: vi.fn(),
        resolveUrl: (path: string) => `http://localhost:3000${path}`,
    };
});

describe('authApi', () => {
    const originalFetch = global.fetch;
    const originalLocalStorage = global.localStorage;

    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();

        // Mock localStorage
        const store: Record<string, string> = {};
        global.localStorage = {
            getItem: vi.fn((key: string) => store[key] || null),
            setItem: vi.fn((key: string, value: string) => {
                store[key] = value;
            }),
            removeItem: vi.fn((key: string) => {
                delete store[key];
            }),
            clear: vi.fn(),
            length: 0,
            key: vi.fn(),
        };
    });

    afterEach(() => {
        global.fetch = originalFetch;
        global.localStorage = originalLocalStorage;
    });

    describe('checkSetupStatus', () => {
        it('returns needsSetup from API response', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ needsSetup: true }),
            });

            const result = await authApi.checkSetupStatus();
            expect(result).toEqual({ needsSetup: true });
        });

        it('throws error when API fails', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
            });

            await expect(authApi.checkSetupStatus()).rejects.toThrow('Could not check setup status.');
        });
    });

    describe('login', () => {
        it('stores user in localStorage on successful login', async () => {
            const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test User', role: 'User' };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ user: mockUser }),
            });

            const result = await authApi.login('test@test.com', 'password123');

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                AUTH_USER_STORAGE_KEY,
                JSON.stringify(mockUser),
            );
        });

        it('returns error message on failed login', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ message: 'Invalid credentials' }),
            });

            const result = await authApi.login('test@test.com', 'wrong');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid credentials');
        });

        it('returns error when response has no user', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });

            const result = await authApi.login('test@test.com', 'password');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid response');
        });
    });

    describe('logout', () => {
        it('clears localStorage even when API fails', async () => {
            const { fetchWithAuth } = await import('../client');
            (fetchWithAuth as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

            await authApi.logout();

            expect(localStorage.removeItem).toHaveBeenCalledWith(AUTH_USER_STORAGE_KEY);
        });
    });

    describe('getAuthenticatedUser', () => {
        it('returns parsed user from localStorage', async () => {
            const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'User' };
            (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(mockUser));

            const result = await authApi.getAuthenticatedUser();

            expect(result).toEqual(mockUser);
        });

        it('returns null when no user in localStorage', async () => {
            (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

            const result = await authApi.getAuthenticatedUser();

            expect(result).toBeNull();
        });

        it('clears corrupted localStorage data and returns null', async () => {
            (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('invalid json');

            const result = await authApi.getAuthenticatedUser();

            expect(result).toBeNull();
            expect(localStorage.removeItem).toHaveBeenCalledWith(AUTH_USER_STORAGE_KEY);
        });
    });

    describe('register', () => {
        it('returns success on successful registration', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ message: 'User created' }),
            });

            const result = await authApi.register('test@test.com', 'Test User', 'password123');

            expect(result.success).toBe(true);
            expect(result.message).toBe('User created');
        });

        it('returns error message on failed registration', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ message: 'Email already exists' }),
            });

            const result = await authApi.register('test@test.com', 'Test', 'pass');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Email already exists');
        });
    });
});
