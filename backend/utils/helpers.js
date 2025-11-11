import { randomUUID } from "crypto";

export const isValidUuid = (value) =>
    typeof value === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);

export const ensureUuid = (value) => (isValidUuid(value) ? value : randomUUID());

export const classifyReportIdentifier = (rawId) => {
    const value = String(rawId ?? '').trim();
    if (!value) {
        throw new Error('Invalid report identifier: value is missing.');
    }
    if (isValidUuid(value)) {
        return { value, sqlType: 'uuid' };
    }
    if (/^\d+$/.test(value)) {
        return { value, sqlType: 'bigint' };
    }
    throw new Error(`Invalid report identifier format: ${value}`);
};

export const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export const toDateOnly = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
            return null;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return trimmed;
        }
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        value = parsed;
    }

    if (value instanceof Date) {
        const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60 * 1000);
        return adjusted.toISOString().slice(0, 10);
    }

    return null;
};

export const toNonNegativeCapacity = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return 0;
    }
    return Math.round(numeric * 100) / 100;
};
