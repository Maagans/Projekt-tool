import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { toErrorMessage, AUTH_USER_STORAGE_KEY, fetchWithAuth } from '../client';

// Mock the authEvents module
vi.mock('../../hooks/projectManager/authEvents', () => ({
    notifyUnauthorizedLogout: vi.fn(),
}));

describe('client utilities', () => {
    describe('toErrorMessage', () => {
        it('extracts message from Error objects', () => {
            const error = new Error('Something went wrong');
            expect(toErrorMessage(error)).toBe('Something went wrong');
        });

        it('returns string errors as-is', () => {
            expect(toErrorMessage('Direct error message')).toBe('Direct error message');
        });

        it('returns default message for unknown errors', () => {
            expect(toErrorMessage(null)).toBe('Der opstod en ukendt fejl.');
            expect(toErrorMessage(undefined)).toBe('Der opstod en ukendt fejl.');
            expect(toErrorMessage(123)).toBe('Der opstod en ukendt fejl.');
            expect(toErrorMessage({})).toBe('Der opstod en ukendt fejl.');
        });

        it('handles Error with empty message', () => {
            const error = new Error('');
            expect(toErrorMessage(error)).toBe('Der opstod en ukendt fejl.');
        });
    });

    describe('AUTH_USER_STORAGE_KEY', () => {
        it('is defined as authUser', () => {
            expect(AUTH_USER_STORAGE_KEY).toBe('authUser');
        });
    });

    describe('fetchWithAuth', () => {
        const originalFetch = global.fetch;

        beforeEach(() => {
            vi.resetAllMocks();
            global.fetch = vi.fn();
        });

        afterEach(() => {
            global.fetch = originalFetch;
        });

        it('adds Content-Type header when body is provided', async () => {
            const mockResponse = {
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ success: true }),
            };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

            await fetchWithAuth('/api/test', {
                method: 'POST',
                body: JSON.stringify({ data: 'test' }),
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.any(Headers),
                }),
            );
        });

        it('returns JSON response for application/json content type', async () => {
            const mockData = { result: 'success' };
            const mockResponse = {
                ok: true,
                headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
                json: () => Promise.resolve(mockData),
            };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

            const result = await fetchWithAuth('/api/test');
            expect(result).toEqual(mockData);
        });

        it('returns empty object for non-JSON responses', async () => {
            const mockResponse = {
                ok: true,
                headers: { get: () => 'text/plain' },
            };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

            const result = await fetchWithAuth('/api/test');
            expect(result).toEqual({});
        });

        it('throws error with message from response body on failed request', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                json: () => Promise.resolve({ message: 'Bad request message' }),
            };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

            await expect(fetchWithAuth('/api/test')).rejects.toThrow('Bad request message');
        });

        it('throws error with status code when no message in response', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                json: () => Promise.resolve({}),
            };
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

            await expect(fetchWithAuth('/api/test')).rejects.toThrow('Request failed with status 500');
        });
    });
});
