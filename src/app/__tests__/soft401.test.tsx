import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppShell } from '../AppShell';
import { ProjectManagerProvider, useAuthManager } from '../../hooks/useProjectManager';
import { createAppQueryClient } from '../../queryClient';
import { api } from '../../api';
import * as authEvents from '../../hooks/projectManager/authEvents';
import type { User } from '../../types';

describe('FE-007 soft 401 handling', () => {
  const originalLocation = window.location;
  let reloadSpy: ReturnType<typeof vi.fn>;
  let hrefSetter: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.spyOn> | null;

  beforeEach(() => {
    reloadSpy = vi.fn();
    hrefSetter = vi.fn();

    let currentHref = 'http://localhost/';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
        replace: vi.fn(),
        reload: reloadSpy,
        get href() {
          return currentHref;
        },
        set href(value: string) {
          currentHref = value;
          hrefSetter(value);
        },
      },
    });

    vi.spyOn(api, 'checkSetupStatus').mockResolvedValue({ needsSetup: false });
    const authenticatedUser: User = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'Administrator',
    };

    vi.spyOn(api, 'getAuthenticatedUser').mockResolvedValue(authenticatedUser);
    vi.spyOn(api, 'saveWorkspace').mockResolvedValue({ success: true });
    vi.spyOn(api, 'logout').mockResolvedValue();

    fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.endsWith('/api/workspace')) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }

      return Promise.reject(new Error(`Unhandled fetch for ${url}`));
    });
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    vi.restoreAllMocks();
    cleanup();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('navigates to /login without forcing a full reload', async () => {
    const queryClient = createAppQueryClient();
    let observedPathname = '';
    const updatePath = (value: string) => {
      observedPathname = value;
    };
    let redirectFlag = false;
    const updateRedirect = (value: boolean) => {
      redirectFlag = value;
    };

    const notifySpy = vi.spyOn(authEvents, 'notifyUnauthorizedLogout');
    const registerSpy = vi.spyOn(authEvents, 'registerUnauthorizedLogoutHandler');

    const AuthObserver = ({ onChange }: { onChange: (value: boolean) => void }) => {
      const { shouldRedirectToLogin } = useAuthManager();
      useEffect(() => {
        onChange(shouldRedirectToLogin);
      }, [onChange, shouldRedirectToLogin]);
      return null;
    };

    const LocationTracker = ({ onChange }: { onChange: (value: string) => void }) => {
      const location = useLocation();
      useEffect(() => {
        onChange(location.pathname);
      }, [location.pathname, onChange]);
      return null;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectManagerProvider>
          <MemoryRouter initialEntries={['/']}>
            <LocationTracker onChange={updatePath} />
            <AuthObserver onChange={updateRedirect} />
            <AppShell />
          </MemoryRouter>
        </ProjectManagerProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(notifySpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(redirectFlag).toBe(true);
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(observedPathname).toBe('/login');
    }, { timeout: 5000 });

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(hrefSetter).not.toHaveBeenCalled();
    expect(api.logout).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
