import { useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { AUTH_USER_STORAGE_KEY } from '../api/client';

const WARNING_THRESHOLD_SECONDS = 5 * 60; // Show modal 5 minutes before expiry

interface UseSessionTimeoutResult {
    showModal: boolean;
    secondsRemaining: number;
    extendSession: () => Promise<void>;
}

/**
 * Hook that monitors JWT token expiry and triggers a warning modal
 * before the session expires.
 */
export const useSessionTimeout = (
    isAuthenticated: boolean,
    onLogout: () => void
): UseSessionTimeoutResult => {
    const [showModal, setShowModal] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(0);
    const [expiryTime, setExpiryTime] = useState<number | null>(null);

    // Parse JWT expiry from token stored in localStorage user data
    const getExpiryFromToken = useCallback((): number | null => {
        try {
            const userJson = localStorage.getItem(AUTH_USER_STORAGE_KEY);
            if (!userJson) return null;

            // The JWT expiry can't be directly read from localStorage user,
            // but we can estimate based on when it was set.
            // For more accuracy, we could decode the JWT cookie, but HttpOnly prevents that.
            // Instead, we'll use a simpler approach: track time since last refresh.

            // Get or set session start time
            const sessionStartKey = 'session_start_time';
            let sessionStart = localStorage.getItem(sessionStartKey);

            if (!sessionStart) {
                sessionStart = Date.now().toString();
                localStorage.setItem(sessionStartKey, sessionStart);
            }

            // JWT expires 30 minutes after session start/refresh
            const sessionStartMs = parseInt(sessionStart, 10);
            const expiryMs = sessionStartMs + (30 * 60 * 1000);

            return expiryMs;
        } catch {
            return null;
        }
    }, []);

    // Initialize expiry time on mount and when auth state changes
    useEffect(() => {
        if (isAuthenticated) {
            const expiry = getExpiryFromToken();
            setExpiryTime(expiry);
        } else {
            setExpiryTime(null);
            setShowModal(false);
        }
    }, [isAuthenticated, getExpiryFromToken]);

    // Update countdown timer
    useEffect(() => {
        if (!isAuthenticated || expiryTime === null) {
            return;
        }

        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
            setSecondsRemaining(remaining);

            // Show modal when we're within warning threshold
            if (remaining <= WARNING_THRESHOLD_SECONDS && remaining > 0) {
                setShowModal(true);
            }

            // Auto-logout when expired
            if (remaining <= 0) {
                setShowModal(false);
                localStorage.removeItem('session_start_time');
                onLogout();
            }
        };

        // Initial update
        updateTimer();

        // Update every second
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [isAuthenticated, expiryTime, onLogout]);

    // Extend session by calling refresh API
    const extendSession = useCallback(async () => {
        try {
            const result = await authApi.refreshSession();
            if (result.success) {
                // Update session start time on successful refresh
                localStorage.setItem('session_start_time', Date.now().toString());
                const newExpiry = Date.now() + (30 * 60 * 1000);
                setExpiryTime(newExpiry);
                setShowModal(false);
            }
        } catch (error) {
            console.error('Failed to extend session:', error);
        }
    }, []);

    return {
        showModal,
        secondsRemaining,
        extendSession,
    };
};
