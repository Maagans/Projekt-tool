const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const toIsoWeek = (dateInput: Date): { year: number; week: number } => {
  const date = startOfUtcDay(dateInput);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = Number(date) - Number(yearStart);
  const week = Math.ceil((diff / MS_PER_DAY + 1) / 7);
  return { year: date.getUTCFullYear(), week };
};

export const formatIsoWeekKey = ({ year, week }: { year: number; week: number }) =>
  `${year}-W${String(week).padStart(2, '0')}`;

export const subtractWeeks = (date: Date, weeks: number): Date => {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() - weeks * 7);
  return result;
};

export const addWeeks = (date: Date, weeks: number): Date => {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
};
