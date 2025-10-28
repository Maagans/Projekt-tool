export const engineeringDepartmentEmployees = [
  { id: "emp-1", capacity: 37.5 },
  { id: "emp-2", capacity: 30 },
  { id: "emp-3", capacity: 45 },
];

export const engineeringDepartmentEntries = [
  {
    week_key: "2025-W01",
    planned_hours: 90,
    actual_hours: 84,
  },
  {
    week_key: "2025-W02",
    planned_hours: 130,
    actual_hours: 120,
  },
];

export const alphaProjectMembers = [
  { id: "emp-10", capacity: 37.5 },
  { id: "emp-11", capacity: 32.5 },
];

export const alphaProjectEntries = [
  {
    week_key: "2025-W52",
    planned_hours: 60,
    actual_hours: 58,
  },
  {
    week_key: "2026-W01",
    planned_hours: 80,
    actual_hours: 92,
  },
];

export const alphaProjectEntriesExtended = [
  ...alphaProjectEntries,
  {
    week_key: "2026-W02",
    planned_hours: 40,
    actual_hours: 36,
  },
];
