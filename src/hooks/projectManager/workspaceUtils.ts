// Shared types for workspace modules
import type { Employee, Project, WorkspaceData } from '../../types';

export type ProjectUpdater = (prev: Project[]) => Project[];
export type EmployeeUpdater = (prev: Employee[]) => Employee[];
export type WorkspaceCacheUpdater = (prev: WorkspaceData | undefined) => WorkspaceData | undefined;

export const WORKSPACE_QUERY_KEY = ['workspace'] as const;
export const PROJECT_SYNC_DEBOUNCE_MS = 400;

// Utility functions
export const clampPercentage = (value: number): number => Math.max(0, Math.min(100, value));

export const parseDateOnlyToUtcDate = (value?: string | null): Date | null => {
    if (!value) {
        return null;
    }
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number.parseInt(yearStr ?? '', 10);
    const month = Number.parseInt(monthStr ?? '', 10);
    const day = Number.parseInt(dayStr ?? '', 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
};

export const toUtcTimestamp = (value?: string | null): number | null => {
    const date = parseDateOnlyToUtcDate(value);
    return date ? date.getTime() : null;
};

export const sanitizeHours = (value: number | undefined): number =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

export const sanitizeCapacity = (value: unknown, fallback: number = 0): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
};

// Mutation context helpers
export interface MutationContext {
    beginMutation: () => void;
    endMutation: () => void;
    handleMutationError: (error: unknown, fallbackMessage: string) => Promise<void>;
    invalidateWorkspace: () => Promise<void>;
    syncWorkspaceCache: (updater: WorkspaceCacheUpdater) => void;
}
