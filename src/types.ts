export type Location = 'Sano Aarhus' | 'Sano Middelfart' | 'Sano Skælskør' | 'Dansk Gigthospital' | 'Sekretariatet';
export const locations: Location[] = ['Sano Aarhus', 'Sano Middelfart', 'Sano Skælskør', 'Dansk Gigthospital', 'Sekretariatet'];

export type UserRole = 'Administrator' | 'Projektleder' | 'Teammedlem';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string | null;
}

export interface Employee {
  id: string; // UUID
  name: string;
  location?: Location;
  email: string;
  maxCapacityHoursWeek?: number;
  azureAdId?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  accountEnabled?: boolean;
  syncedAt?: string | null;
}

export interface MainTableRow {
  id: string;
  title: string;
  status: 'green' | 'yellow' | 'red';
  note: string;
}

export interface Risk {
  id: string;
  name: string;
  s: number; // Sandsynlighed (Probability)
  k: number; // Konsekvens (Consequence)
}

export interface Phase {
  id: string;
  text: string;
  start: number; // Percentage
  end: number;   // Percentage
  highlight: string;
}

export interface Milestone {
  id: string;
  text: string;
  position: number; // Percentage
}

export interface Deliverable {
  id: string;
  text: string;
  position: number; // Percentage
}

export interface KanbanTask {
  id: string;
  content: string;
  status: 'todo' | 'doing' | 'done';
}

export interface ListItem {
  id: string;
  content: string;
}

export interface TimeEntry {
    weekKey: string; // "2024-W23"
    plannedHours: number;
    actualHours: number;
}

export interface ProjectMember {
  id: string; // UUID
  employeeId: string; // Reference to the central Employee ID
  role: string;
  group: 'styregruppe' | 'projektgruppe' | 'partnere' | 'referencegruppe' | 'unassigned';
  isProjectLead?: boolean;
  timeEntries: TimeEntry[];
}

export interface ProjectState {
  statusItems: ListItem[];
  challengeItems: ListItem[];
  mainTableRows: MainTableRow[];
  risks: Risk[];
  phases: Phase[];
  milestones: Milestone[];
  deliverables: Deliverable[];
  kanbanTasks: KanbanTask[];
}

export interface ProjectConfig {
  projectName: string;
  projectStartDate: string; // YYY-MM-DD
  projectEndDate: string;   // YYY-MM-DD
}

export type ProjectStatus = 'active' | 'completed' | 'on-hold';

export interface Report {
  weekKey: string; // e.g., "2024-W23"
  state: ProjectState;
}

export interface ProjectPermissions {
  canEdit: boolean;
  canLogTime: boolean;
}

export interface Project {
  id: string; // UUID
  config: ProjectConfig;
  reports: Report[];
  projectMembers: ProjectMember[];
  status: ProjectStatus;
  permissions: ProjectPermissions;
}

export interface WorkspaceSettings {
  pmoBaselineHoursWeek: number;
}

export interface WorkspaceData {
  projects: Project[];
  employees: Employee[];
  settings: WorkspaceSettings;
}

export type ResourceAnalyticsScope = 'department' | 'project';

export interface ResourceAnalyticsPoint {
  week: string;
  capacity: number;
  planned: number;
  actual: number;
}

export interface ResourceAnalyticsProjectBreakdownItem {
  projectId: string;
  projectName: string;
  planned: number;
  actual: number;
}

export interface ResourceAnalyticsStackProject {
  projectId: string;
  projectName: string;
  hours: number;
}

export interface ResourceAnalyticsStackEntry {
  week: string;
  projects: ResourceAnalyticsStackProject[];
}

export interface ResourceAnalyticsTotals {
  capacity: number;
  planned: number;
  actual: number;
  baseline: number;
}

export interface ResourceAnalyticsPayload {
  scope: {
    type: ResourceAnalyticsScope;
    id: string;
  };
  series: ResourceAnalyticsPoint[];
  overAllocatedWeeks: string[];
  projectBreakdown: ResourceAnalyticsProjectBreakdownItem[];
  projectStackPlan: ResourceAnalyticsStackEntry[];
  projectStackActual: ResourceAnalyticsStackEntry[];
  totals: ResourceAnalyticsTotals;
  baselineHoursWeek: number;
  baselineTotalHours: number;
}

export interface ResourceAnalyticsQuery {
  scope: ResourceAnalyticsScope;
  scopeId: string;
  fromWeek: string;
  toWeek: string;
}
