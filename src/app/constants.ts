const toBoolean = (value: unknown, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off', ''].includes(normalized)) {
    return false;
  }
  return fallback;
};

export const RESOURCES_ANALYTICS_ENABLED = toBoolean(import.meta.env.VITE_RESOURCES_ANALYTICS_ENABLED, false);
export const PROJECT_RISK_ANALYSIS_ENABLED = toBoolean(import.meta.env.VITE_PROJECT_RISK_ANALYSIS_ENABLED, true);
