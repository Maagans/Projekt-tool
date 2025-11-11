import type { RangeMode, ViewMode } from './types';

export const DEFAULT_WEEK_RANGE = 12;
export const RANGE_OPTIONS = [6, 12, 24, 52] as const;

export const RANGE_MODE_OPTIONS: Array<{ value: RangeMode; label: string }> = [
  { value: 'past', label: 'Historik' },
  { value: 'future', label: 'Fremtid' },
];

export const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'weekly', label: 'Ugentlig' },
  { value: 'summary', label: 'Opsummeret' },
  { value: 'cumulative', label: 'Kumulativ' },
];

export const ALL_DEPARTMENTS_OPTION = '__ALL__';
