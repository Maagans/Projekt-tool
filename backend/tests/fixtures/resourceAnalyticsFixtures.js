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

export const engineeringDepartmentBreakdown = [
  {
    project_id: "5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa",
    project_name: "Alpha",
    planned_hours: 140,
    actual_hours: 132,
  },
  {
    project_id: "5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb",
    project_name: "Beta",
    planned_hours: 80,
    actual_hours: 72,
  },
];

export const engineeringDepartmentStackEntries = [
  {
    project_id: "5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa",
    project_name: "Alpha",
    week_key: "2025-W01",
    planned_hours: 60,
    actual_hours: 55,
  },
  {
    project_id: "5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb",
    project_name: "Beta",
    week_key: "2025-W01",
    planned_hours: 30,
    actual_hours: 29,
  },
  {
    project_id: "5ac7b3f2-318e-40ff-9c3a-aaaaaaaaaaaa",
    project_name: "Alpha",
    week_key: "2025-W02",
    planned_hours: 80,
    actual_hours: 77,
  },
  {
    project_id: "5ac7b3f2-318e-40ff-9c3a-bbbbbbbbbbbb",
    project_name: "Beta",
    week_key: "2025-W02",
    planned_hours: 50,
    actual_hours: 43,
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
