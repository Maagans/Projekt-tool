const CATEGORY_DEFINITIONS = {
  technical: { label: 'Teknisk', badge: 'slate' },
  resource: { label: 'Ressourcer', badge: 'orange' },
  scope: { label: 'Scope & krav', badge: 'indigo' },
  timeline: { label: 'Tidsplan', badge: 'emerald' },
  budget: { label: 'Økonomi', badge: 'rose' },
  compliance: { label: 'Compliance & sikkerhed', badge: 'red' },
  other: { label: 'Andre risici', badge: 'gray' },
};

export const PROJECT_RISK_CATEGORY_DEFINITIONS = CATEGORY_DEFINITIONS;
export const PROJECT_RISK_CATEGORY_KEYS = Object.keys(CATEGORY_DEFINITIONS);

export const PROJECT_RISK_STATUSES = ['open', 'monitoring', 'closed'];

const clampScore = (value) => Math.max(1, Math.min(25, value));

export const normalizeRiskCategory = (input) => {
  if (typeof input !== 'string') {
    return 'other';
  }
  const normalized = input.trim().toLowerCase();
  return PROJECT_RISK_CATEGORY_KEYS.includes(normalized) ? normalized : 'other';
};

export const assertRiskScale = (value, fieldName = 'value') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 5) {
    const error = new Error(`${fieldName} must be between 1 and 5`);
    error.statusCode = 400;
    throw error;
  }
  return Math.round(numeric);
};

export const calculateRiskScore = (probability, impact) => {
  const prob = assertRiskScale(probability, 'probability');
  const imp = assertRiskScale(impact, 'impact');
  return clampScore(prob * imp);
};

export const buildCategoryMeta = (input) => {
  const key = normalizeRiskCategory(input);
  return {
    key,
    ...CATEGORY_DEFINITIONS[key],
  };
};
