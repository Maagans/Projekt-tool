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
  s: number; // Sandsynlighed
  k: number; // Konsekvens
  projectRiskId?: string | null;
  description?: string | null;
  status?: ProjectRiskStatus;
  categoryKey?: ProjectRiskCategoryKey;
  ownerName?: string | null;
  ownerEmail?: string | null;
  mitigationPlanA?: string | null;
  mitigationPlanB?: string | null;
  followUpNotes?: string | null;
  followUpFrequency?: string | null;
  dueDate?: string | null;
  lastFollowUpAt?: string | null;
  projectRiskArchived?: boolean;
  projectRiskUpdatedAt?: string | null;
}

export type PhaseStatus = 'Planned' | 'Active' | 'Completed';
export type MilestoneStatus = 'Pending' | 'On Track' | 'Delayed' | 'Completed';
export type DeliverableStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Workstream {
  id: string;
  name: string;
  order: number;
}

export interface Phase {
  id: string;
  text: string;
  start: number; // Percentage
  end: number;   // Percentage
  highlight: string;
  workstreamId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: PhaseStatus | null;
}

export interface Milestone {
  id: string;
  text: string;
  position: number; // Percentage
  date?: string | null;
  status?: MilestoneStatus | null;
  workstreamId?: string | null;
}

export interface DeliverableChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Deliverable {
  id: string;
  text: string;
  position: number; // Percentage
  milestoneId?: string | null;
  status?: DeliverableStatus | null;
  owner?: string | null;
  ownerId?: string | null;
  description?: string | null;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress?: number | null;
  checklist?: DeliverableChecklistItem[];
}

export interface KanbanTask {
  id: string;
  content: string;
  status: 'todo' | 'doing' | 'done';
  assignee?: string | null;
  dueDate?: string | null; // YYYY-MM-DD
  notes?: string | null;
  createdAt: string;
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
  nextStepItems: ListItem[];
  mainTableRows: MainTableRow[];
  risks: Risk[];
  phases: Phase[];
  milestones: Milestone[];
  deliverables: Deliverable[];
  kanbanTasks: KanbanTask[];
  workstreams?: Workstream[];
}

export interface ProjectConfig {
  projectName: string;
  projectStartDate: string; // YYY-MM-DD
  projectEndDate: string;   // YYY-MM-DD
  heroImageUrl?: string | null;
  projectGoal?: string;
  businessCase?: string;
  totalBudget?: number | null;
}

export type ProjectStatus = 'active' | 'completed' | 'on-hold';

export interface Report {
  id?: string;
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
  workstreams?: Workstream[];
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

export type ProjectRiskCategoryKey =
  | 'technical'
  | 'resource'
  | 'scope'
  | 'timeline'
  | 'budget'
  | 'compliance'
  | 'other';

export type ProjectRiskStatus = 'open' | 'monitoring' | 'closed';

export interface ProjectRiskCategoryMeta {
  key: ProjectRiskCategoryKey;
  label: string;
  badge: string;
  description?: string;
}

export interface ProjectRiskOwner {
  id: string;
  name: string | null;
  email: string | null;
}

export interface ProjectRisk {
  id: string;
  projectId: string;
  projectRiskId?: string | null;
  title: string;
  description: string | null;
  probability: number;
  impact: number;
  score: number;
  mitigationPlanA: string | null;
  mitigationPlanB: string | null;
  owner: ProjectRiskOwner | null;
  followUpNotes: string | null;
  followUpFrequency: string | null;
  category: ProjectRiskCategoryMeta;
  lastFollowUpAt: string | null;
  dueDate: string | null;
  status: ProjectRiskStatus;
  isArchived: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  projectRiskUpdatedAt?: string | null;
}

export interface ProjectRiskInput {
  title: string;
  description?: string | null;
  probability?: number;
  impact?: number;
  mitigationPlanA?: string | null;
  mitigationPlanB?: string | null;
  ownerId?: string | null;
  followUpNotes?: string | null;
  followUpFrequency?: string | null;
  category?: ProjectRiskCategoryKey;
  lastFollowUpAt?: string | null;
  dueDate?: string | null;
  status?: ProjectRiskStatus;
}

export type ProjectRiskUpdateInput = Partial<ProjectRiskInput> & {
  title?: string;
  isArchived?: boolean;
};

export interface ProjectRiskFilters {
  status?: ProjectRiskStatus | undefined;
  ownerId?: string | undefined;
  category?: ProjectRiskCategoryKey | undefined;
  includeArchived?: boolean | undefined;
  overdue?: boolean | undefined;
}
