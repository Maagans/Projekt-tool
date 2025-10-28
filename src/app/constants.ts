export const RESOURCES_ANALYTICS_ENABLED =
  String(import.meta.env.VITE_RESOURCES_ANALYTICS_ENABLED ?? 'false').trim().toLowerCase() === 'true';

