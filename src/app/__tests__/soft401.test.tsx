import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ProjectManagerProvider, useAuthManager } from '../../hooks/useProjectManager';
import { createAppQueryClient } from '../../queryClient';
import { api } from '../../api';
import * as authEvents from '../../hooks/projectManager/authEvents';
import type { User } from '../../types';

describe('FE-007 soft 401 handling', () => {
  const originalLocation = window.location;
  let reloadSpy: ReturnType<typeof vi.fn>;
  let hrefSetter: ReturnType<typeof vi.fn>;

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
    vi.spyOn(api, 'getWorkspace').mockResolvedValue({
      projects: [],
      employees: [],
      settings: { pmoBaselineHoursWeek: 0 },
    });
    vi.spyOn(api, 'logout').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('sets shouldRedirectToLogin without forcing a full reload', async () => {
    const queryClient = createAppQueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ProjectManagerProvider>{children}</ProjectManagerProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuthManager(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      authEvents.notifyUnauthorizedLogout();
    });

    await waitFor(() => expect(result.current.shouldRedirectToLogin).toBe(true));

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(hrefSetter).not.toHaveBeenCalled();
    expect(api.logout).not.toHaveBeenCalled();

    queryClient.clear();
  });
});

