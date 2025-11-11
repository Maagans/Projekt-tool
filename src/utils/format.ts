export const formatHours = (
  value: number,
  options?: Intl.NumberFormatOptions,
  locales: Intl.LocalesArgument = 'da-DK',
): string => {
  const formatter = new Intl.NumberFormat(locales, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    ...options,
  });
  return formatter.format(value);
};

export const formatWeekLabel = (weekKey: string): string => {
  const [yearPart, weekPart] = weekKey.split('-W');
  if (!yearPart || !weekPart) {
    return weekKey;
  }
  return `Uge ${Number(weekPart)} (${yearPart})`;
};

export const formatDiffHours = (value: number): string => {
  if (!Number.isFinite(value) || value === 0) {
    return '0 timer';
  }
  const prefix = value > 0 ? '+' : '-';
  return `${prefix}${formatHours(Math.abs(value))} timer`;
};
