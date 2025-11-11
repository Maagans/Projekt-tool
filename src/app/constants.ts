const toBoolean = (value: unknown) => String(value ?? 'false').trim().toLowerCase() === 'true';

export const RESOURCES_ANALYTICS_ENABLED = toBoolean(import.meta.env.VITE_RESOURCES_ANALYTICS_ENABLED);
export const PROJECT_RISK_ANALYSIS_ENABLED = toBoolean(import.meta.env.VITE_PROJECT_RISK_ANALYSIS_ENABLED);
