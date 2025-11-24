
export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum ProjectStatus {
  ON_TRACK = 'On Track',
  AT_RISK = 'At Risk',
  DELAYED = 'Delayed',
  COMPLETED = 'Completed'
}

export interface Risk {
  id: string;
  title: string;
  probability: number; // 1-5
  impact: number; // 1-5
  owner: string;
  mitigation: string;
}

export interface Phase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Planned' | 'Active' | 'Completed';
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Deliverable {
  id: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  owner?: string;        // Ansvarlig
  description?: string;  // Beskrivelse
  notes?: string;        // Noter
  checklist?: ChecklistItem[]; // Tjekliste
  
  // New fields for Gantt/Activity view
  startDate?: string;
  endDate?: string;
  progress?: number; // 0-100
}

export interface Workstream {
  id: string;
  name: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  status: 'Completed' | 'On Track' | 'Delayed' | 'Pending';
  workstream?: string; // Now references the Workstream Name
  deliverables?: Deliverable[]; 
}

export interface ResourceData {
  week: string;
  projectA: number;
  projectB: number;
  admin: number;
  availableCapacity: number;
  pmoBaseline: number;
}

export interface Project {
  id: string;
  name: string;
  department: string;
  status: ProjectStatus;
  manager: string;
  risks: Risk[];
  description: string;
  phases: Phase[];
  workstreams: Workstream[]; // List of defined swimlanes
  milestones: Milestone[];
  startDate?: string; // Project overall start
  endDate?: string;   // Project overall end
}

export interface AIReportConfig {
  focus: 'risks' | 'capacity' | 'general';
  detailLevel: 'summary' | 'detailed';
}
