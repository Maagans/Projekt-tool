import pool from "../db.js";
import { createAppError } from "../utils/errors.js";

const isoWeekPattern = /^(\d{4})-W(\d{2})$/;
const MAX_SUPPORTED_RANGE_WEEKS = 520;
const DEFAULT_CACHE_TTL_MS = 2 * 60 * 1000;

const defaultCache = new Map();

const buildCacheKey = ({ scope, scopeId, fromWeek, toWeek }) =>
  `${scope}:${scopeId}:${fromWeek}:${toWeek}`;

const getFromCache = (cache, key, now = Date.now) => {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }
  return cached.value;
};

const setCacheEntry = (cache, key, value, ttlMs = DEFAULT_CACHE_TTL_MS, now = Date.now) => {
  cache.set(key, {
    expiresAt: now() + ttlMs,
    value,
  });
};

export const clearResourceAnalyticsCache = () => {
  defaultCache.clear();
};

const isLeapYear = (year) => {
  if (!Number.isInteger(year)) {
    throw createAppError("Year must be an integer.", 400);
  }
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

const getIsoWeeksInYear = (year) => {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const jan1Weekday = jan1.getUTCDay() || 7;
  if (jan1Weekday === 4 || (jan1Weekday === 3 && isLeapYear(year))) {
    return 53;
  }
  return 52;
};

const formatWeekKey = (year, week) => `${year}-W${String(week).padStart(2, "0")}`;

const parseWeekKey = (weekKey) => {
  const match = isoWeekPattern.exec(weekKey);
  if (!match) {
    throw createAppError(`Invalid ISO week format: ${weekKey}`, 400);
  }

  const year = Number.parseInt(match[1], 10);
  const week = Number.parseInt(match[2], 10);
  if (Number.isNaN(year) || Number.isNaN(week)) {
    throw createAppError(`Invalid ISO week value: ${weekKey}`, 400);
  }

  if (week < 1 || week > 53) {
    throw createAppError(`Week number out of range: ${weekKey}`, 400);
  }

  const weeksInYear = getIsoWeeksInYear(year);
  if (week > weeksInYear) {
    throw createAppError(`Week ${weekKey} is not valid for ${year}`, 400);
  }

  return { year, week };
};

const expandWeekRange = (fromWeek, toWeek) => {
  const { year: fromYear, week: fromWeekNumber } = parseWeekKey(fromWeek);
  const { year: toYear, week: toWeekNumber } = parseWeekKey(toWeek);

  const weeks = [];
  let currentYear = fromYear;
  let currentWeek = fromWeekNumber;

  weeks.push(formatWeekKey(currentYear, currentWeek));

  let guard = 0;
  while (!(currentYear === toYear && currentWeek === toWeekNumber)) {
    guard += 1;
    if (guard > MAX_SUPPORTED_RANGE_WEEKS) {
      throw createAppError("Week range is too large. Limit to 520 weeks.", 400);
    }

    const weeksInYear = getIsoWeeksInYear(currentYear);
    if (currentWeek < weeksInYear) {
      currentWeek += 1;
    } else {
      currentYear += 1;
      currentWeek = 1;
    }
    weeks.push(formatWeekKey(currentYear, currentWeek));
  }

  return weeks;
};

const normalizeRange = (range) => {
  if (!range || typeof range !== "object") {
    throw createAppError("Range with fromWeek and toWeek is required.", 400);
  }

  const { fromWeek, toWeek } = range;
  if (typeof fromWeek !== "string" || !isoWeekPattern.test(fromWeek)) {
    throw createAppError("fromWeek must be provided in the format YYYY-Www.", 400);
  }
  if (typeof toWeek !== "string" || !isoWeekPattern.test(toWeek)) {
    throw createAppError("toWeek must be provided in the format YYYY-Www.", 400);
  }

  if (fromWeek.localeCompare(toWeek) > 0) {
    throw createAppError("fromWeek cannot be after toWeek.", 400);
  }

  // parseWeekKey will validate week numbers for the given year
  parseWeekKey(fromWeek);
  parseWeekKey(toWeek);

  return { fromWeek, toWeek };
};

const buildRangeClause = ({ fromWeek, toWeek }, startIndex = 1) => {
  const conditions = [];
  const params = [];
  let index = startIndex;

  if (fromWeek) {
    conditions.push(`t.week_key >= $${index}`);
    params.push(fromWeek);
    index += 1;
  }

  if (toWeek) {
    conditions.push(`t.week_key <= $${index}`);
    params.push(toWeek);
  }

  const clause = conditions.length > 0 ? ` AND ${conditions.join(" AND ")}` : "";
  return { clause, params };
};

const mapEntriesByWeek = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!row || !row.week_key) {
      return;
    }
    map.set(row.week_key, {
      planned: Number(row.planned_hours ?? 0),
      actual: Number(row.actual_hours ?? 0),
    });
  });
  return map;
};

const calculateOverAllocatedWeeks = (series) =>
  series.filter((point) => point.planned > point.capacity || point.actual > point.capacity).map((point) => point.week);

const ensureDepartment = (department) => {
  if (typeof department !== "string" || department.trim() === "") {
    throw createAppError("department must be a non-empty string.", 400);
  }
  return department;
};

const ensureProjectId = (projectId) => {
  if (typeof projectId !== "string" || projectId.trim() === "") {
    throw createAppError("projectId must be a non-empty string.", 400);
  }
  return projectId;
};

export const calcDepartmentSeries = async (department, { range, dbClient } = {}) => {
  const validatedDepartment = ensureDepartment(department);
  const { fromWeek, toWeek } = normalizeRange(range);
  const database = dbClient ?? pool;

  const employeesResult = await database.query(
    `
      SELECT id::text, COALESCE(max_capacity_hours_week, 0)::float AS capacity
      FROM employees
      WHERE department = $1
    `,
    [validatedDepartment],
  );

  const totalCapacity = (employeesResult.rows ?? []).reduce((sum, row) => sum + Number(row.capacity ?? 0), 0);

  const { clause: rangeClause, params: rangeParams } = buildRangeClause({ fromWeek, toWeek }, 2);
  const timeEntriesResult = await database.query(
    `
      SELECT t.week_key,
             SUM(t.planned_hours)::float AS planned_hours,
             SUM(t.actual_hours)::float AS actual_hours
      FROM project_member_time_entries t
      JOIN project_members pm ON pm.id = t.project_member_id
      JOIN employees e ON e.id = pm.employee_id
      WHERE e.department = $1${rangeClause}
      GROUP BY t.week_key
      ORDER BY t.week_key ASC
    `,
    [validatedDepartment, ...rangeParams],
  );

  const entriesByWeek = mapEntriesByWeek(timeEntriesResult.rows ?? []);
  const weekKeys = expandWeekRange(fromWeek, toWeek);

  const series = weekKeys.map((week) => {
    const entry = entriesByWeek.get(week);
    return {
      week,
      capacity: totalCapacity,
      planned: entry ? entry.planned : 0,
      actual: entry ? entry.actual : 0,
    };
  });

  return {
    scope: { type: "department", id: validatedDepartment },
    series,
    overAllocatedWeeks: calculateOverAllocatedWeeks(series),
  };
};

export const calcProjectSeries = async (projectId, { range, dbClient } = {}) => {
  const validatedProjectId = ensureProjectId(projectId);
  const { fromWeek, toWeek } = normalizeRange(range);
  const database = dbClient ?? pool;

  const projectResult = await database.query(
    `
      SELECT id::text
      FROM projects
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [validatedProjectId],
  );

  if (projectResult.rowCount === 0) {
    throw createAppError("Project not found.", 404);
  }

  const memberResult = await database.query(
    `
      SELECT DISTINCT e.id::text, COALESCE(e.max_capacity_hours_week, 0)::float AS capacity
      FROM project_members pm
      JOIN employees e ON e.id = pm.employee_id
      WHERE pm.project_id = $1::uuid
    `,
    [validatedProjectId],
  );

  const totalCapacity = (memberResult.rows ?? []).reduce((sum, row) => sum + Number(row.capacity ?? 0), 0);

  const { clause: rangeClause, params: rangeParams } = buildRangeClause({ fromWeek, toWeek }, 2);
  const timeEntriesResult = await database.query(
    `
      SELECT t.week_key,
             SUM(t.planned_hours)::float AS planned_hours,
             SUM(t.actual_hours)::float AS actual_hours
      FROM project_member_time_entries t
      JOIN project_members pm ON pm.id = t.project_member_id
      WHERE pm.project_id = $1::uuid${rangeClause}
      GROUP BY t.week_key
      ORDER BY t.week_key ASC
    `,
    [validatedProjectId, ...rangeParams],
  );

  const entriesByWeek = mapEntriesByWeek(timeEntriesResult.rows ?? []);
  const weekKeys = expandWeekRange(fromWeek, toWeek);

  const series = weekKeys.map((week) => {
    const entry = entriesByWeek.get(week);
    return {
      week,
      capacity: totalCapacity,
      planned: entry ? entry.planned : 0,
      actual: entry ? entry.actual : 0,
    };
  });

  return {
    scope: { type: "project", id: validatedProjectId },
    series,
    overAllocatedWeeks: calculateOverAllocatedWeeks(series),
  };
};

export const aggregateResourceAnalytics = async (
  { scope, scopeId, range, dbClient } = {},
  { cache = defaultCache, ttlMs = DEFAULT_CACHE_TTL_MS, now = Date.now } = {},
) => {
  const normalizedRange = normalizeRange(range);

  const cacheKey = buildCacheKey({
    scope,
    scopeId,
    fromWeek: normalizedRange.fromWeek,
    toWeek: normalizedRange.toWeek,
  });

  const cached = getFromCache(cache, cacheKey, now);
  if (cached) {
    return cached;
  }

  if (scope === "department") {
    const result = await calcDepartmentSeries(scopeId, { range: normalizedRange, dbClient });
    setCacheEntry(cache, cacheKey, result, ttlMs, now);
    return result;
  }
  if (scope === "project") {
    const result = await calcProjectSeries(scopeId, { range: normalizedRange, dbClient });
    setCacheEntry(cache, cacheKey, result, ttlMs, now);
    return result;
  }
  throw createAppError("Unsupported scope type. Use 'department' or 'project'.", 400);
};

export default {
  calcDepartmentSeries,
  calcProjectSeries,
  aggregateResourceAnalytics,
  clearResourceAnalyticsCache,
};
