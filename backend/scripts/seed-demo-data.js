import bcrypt from 'bcryptjs';
import pg from 'pg';
import { randomUUID } from 'crypto';
import { config } from '../config/index.js';

const { Pool } = pg;

const WORKSPACE_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_BASELINE_HOURS = 520;
const DEFAULT_USER_PASSWORD = 'Velkommen2025!';

const CLI_FLAGS = new Set(process.argv.slice(2));
const SHOULD_RESET = CLI_FLAGS.has('--reset');
const SKIP_USERS = CLI_FLAGS.has('--skip-users');

const TABLES_TO_RESET = [
  'report_kanban_tasks',
  'report_deliverable_checklist',
  'report_deliverables',
  'report_milestones',
  'report_phases',
  'report_risks',
  'report_risk_snapshots',
  'report_main_table_rows',
  'report_challenge_items',
  'report_next_step_items',
  'report_status_items',
  'reports',
  'project_deliverable_checklist',
  'project_deliverables',
  'project_milestones',
  'project_phases',
  'project_risk_history',
  'project_risks',
  'project_workstreams',
  'project_member_time_entries',
  'project_members',
  'projects',
];

const truncateExistingTables = async (client, tableNames) => {
  for (const table of tableNames) {
    await client.query(
      `
      DO $$
      BEGIN
        IF to_regclass('${table}') IS NOT NULL THEN
          EXECUTE 'TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE';
        END IF;
      END$$;
    `,
    );
  }
};

const workspaces = [
  {
    key: 'sekretariatet',
    name: 'Sekretariatet',
    type: 'sekretariat',
    config: { timeMode: 'monthly', defaultPlanningHorizonMonths: 12 },
  },
  {
    key: 'behandling',
    name: 'Behandlingsstederne',
    type: 'behandling',
    config: { timeMode: 'weekly', defaultPlanningHorizonMonths: 8 },
  },
];

const organizations = [
  { key: 'sekretariatet', name: 'Sekretariatet', code: 'SEK' },
  { key: 'sano', name: 'Sano', code: 'SANO' },
  { key: 'dgh', name: 'Dansk Gigthospital', code: 'DGH' },
];

const locations = [
  { key: 'sano-aarhus', organizationKey: 'sano', name: 'Aarhus', code: 'AAR' },
  { key: 'sano-middelfart', organizationKey: 'sano', name: 'Middelfart', code: 'MID' },
  { key: 'sano-skaelskoer', organizationKey: 'sano', name: 'Skælskør', code: 'SKA' },
];

const employees = [
  {
    key: 'maja-holm',
    name: 'Maja Holm',
    email: 'maja.holm@demo.projekt',
    location: 'Sekretariatet',
    workspaceKey: 'sekretariatet',
    organizationKey: 'sekretariatet',
    locationKey: null,
    maxCapacity: 37,
    department: 'Digitalisering & IT',
    jobTitle: 'Senior Project Manager',
    accountEnabled: true,
  },
  {
    key: 'sofia-birk',
    name: 'Sofia Birk',
    email: 'sofia.birk@demo.projekt',
    location: 'Sano Aarhus',
    workspaceKey: 'behandling',
    organizationKey: 'sano',
    locationKey: 'sano-aarhus',
    maxCapacity: 35,
    department: 'Connected Care',
    jobTitle: 'Programchef for telemedicin',
    accountEnabled: true,
  },
  {
    key: 'rasmus-lund',
    name: 'Rasmus Lund',
    email: 'rasmus.lund@demo.projekt',
    location: 'Sano Aarhus',
    workspaceKey: 'behandling',
    organizationKey: 'sano',
    locationKey: 'sano-aarhus',
    maxCapacity: 37,
    department: 'Data & Insights',
    jobTitle: 'Lead Data Engineer',
    accountEnabled: true,
  },
  {
    key: 'linea-skov',
    name: 'Linea Skov',
    email: 'linea.skov@demo.projekt',
    location: 'Sano Aarhus',
    workspaceKey: 'behandling',
    organizationKey: 'sano',
    locationKey: 'sano-aarhus',
    maxCapacity: 30,
    department: 'Innovation Lab',
    jobTitle: 'Projektleder for kliniske flows',
    accountEnabled: true,
  },
  {
    key: 'ahmed-yasin',
    name: 'Ahmed Yasin',
    email: 'ahmed.yasin@demo.projekt',
    location: 'Sano Sk?lsk?r',
    workspaceKey: 'behandling',
    organizationKey: 'sano',
    locationKey: 'sano-skaelskoer',
    maxCapacity: 37,
    department: 'Innovation Lab',
    jobTitle: 'Integrationsarkitekt',
    accountEnabled: true,
  },
  {
    key: 'maria-jorgensen',
    name: 'Maria Jorgensen',
    email: 'maria.jorgensen@demo.projekt',
    location: 'Sano Sk?lsk?r',
    workspaceKey: 'behandling',
    organizationKey: 'sano',
    locationKey: 'sano-skaelskoer',
    maxCapacity: 28,
    department: 'Patientoplevelser',
    jobTitle: 'UX Lead',
    accountEnabled: true,
  },
  {
    key: 'frederik-hald',
    name: 'Frederik Hald',
    email: 'frederik.hald@demo.projekt',
    location: 'Sekretariatet',
    workspaceKey: 'sekretariatet',
    organizationKey: 'sekretariatet',
    locationKey: null,
    maxCapacity: 37,
    department: 'Finance Transformation',
    jobTitle: 'Automation Specialist',
    accountEnabled: true,
  },
  {
    key: 'clara-petersen',
    name: 'Clara Petersen',
    email: 'clara.petersen@demo.projekt',
    location: 'Sano Middelfart',
    workspaceKey: 'behandling',
    organizationKey: 'sano',
    locationKey: 'sano-middelfart',
    maxCapacity: 30,
    department: 'Facility Services',
    jobTitle: 'IoT Analyst',
    accountEnabled: true,
  },
  {
    key: 'julie-sand',
    name: 'Julie Sand',
    email: 'julie.sand@demo.projekt',
    location: 'Dansk Gigthospital',
    workspaceKey: 'behandling',
    organizationKey: 'dgh',
    locationKey: null,
    maxCapacity: 24,
    department: 'PMO',
    jobTitle: 'Change Manager',
    accountEnabled: true,
  },
  {
    key: 'nina-iversen',
    name: 'Nina Iversen',
    email: 'nina.iversen@demo.projekt',
    location: 'Sekretariatet',
    workspaceKey: 'sekretariatet',
    organizationKey: 'sekretariatet',
    locationKey: null,
    maxCapacity: 34,
    department: 'Finance Transformation',
    jobTitle: 'QA Lead',
    accountEnabled: true,
  },
  {
    key: 'henrik-vestergaard',
    name: 'Henrik Vestergaard',
    email: 'henrik.vestergaard@demo.projekt',
    location: 'Sekretariatet',
    workspaceKey: 'sekretariatet',
    organizationKey: 'sekretariatet',
    locationKey: null,
    maxCapacity: 32,
    department: 'Procesforbedring',
    jobTitle: 'Portef?ljekonsulent',
    accountEnabled: true,
  },
  {
    key: 'emma-kristensen',
    name: 'Emma Kristensen',
    email: 'emma.kristensen@demo.projekt',
    location: 'Sekretariatet',
    workspaceKey: 'sekretariatet',
    organizationKey: 'sekretariatet',
    locationKey: null,
    maxCapacity: 30,
    department: '?konomi & Portef?lje',
    jobTitle: 'Business Controller',
    accountEnabled: true,
  },
];

const employeeLookup = new Map(employees.map((employee) => [employee.key, employee]));

const demoUsers = [
  {
    email: 'maja.holm@demo.projekt',
    name: 'Maja Holm',
    role: 'Projektleder',
    employeeKey: 'maja-holm',
  },
  {
    email: 'sofia.birk@demo.projekt',
    name: 'Sofia Birk',
    role: 'Projektleder',
    employeeKey: 'sofia-birk',
  },
  {
    email: 'clara.petersen@demo.projekt',
    name: 'Clara Petersen',
    role: 'Teammedlem',
    employeeKey: 'clara-petersen',
  },
];

const projects = [
  {
    key: 'rehab-tracker-platform',
    name: 'Rehab Tracker Platform',
    workspaceKey: 'behandling',
    startDate: '2025-08-01',
    endDate: '2026-06-30',
    status: 'active',
    description:
      'Udvikler f?lles tele-rehabiliteringsplatform med video, sensordata og patientkommunikation til alle behandlingssteder.',
    projectGoal:
      'Give terapeuter ?t cockpit til planl?gning, opf?lgning og monitorering s? rehabiliteringsforl?b forkortes og kvaliteten dokumenteres.',
    businessCase:
      'Reducerer manuelle registreringer med 45 procent og frig?r 8 FTE pa ?rligt samt h?jere patienttilfredshed.',
    totalBudget: 3800000,
    heroImageUrl: 'https://picsum.photos/seed/rehab-tracker/1200/400',
  },
  {
    key: 'clinical-ai-triage',
    name: 'Clinical AI Triage',
    workspaceKey: 'behandling',
    startDate: '2025-05-15',
    endDate: '2026-03-01',
    status: 'active',
    description:
      'Implementerer AI-baseret triagering p? akutmodtagelserne s? klinikere f?r st?ttet beslutning ved f?rste kontakt.',
    projectGoal:
      'Automatisere fordelingen af patienter til behandlingsspor baseret p? historiske data og sensorinput.',
    businessCase:
      'Forventet reduktion af ventetid med 18 procent og f?rre omvisiteringer gennem bedre datadrevet triage.',
    totalBudget: 2400000,
    heroImageUrl: 'https://picsum.photos/seed/clinical-ai/1200/400',
  },
  {
    key: 'shared-services-automation',
    name: 'Shared Services Automation',
    workspaceKey: 'sekretariatet',
    startDate: '2025-04-01',
    endDate: '2026-01-31',
    status: 'active',
    description:
      'Automatiserer budgetopf?lgning, kontraktdata og PMO-rapportering i Sekretariatets f?lles services.',
    projectGoal:
      'Digitalisere portef?ljestyring s? teams kan opdatere status ?n gang og data genbruges i alle ledelsesrapporter.',
    businessCase:
      'Sparer 1.600 manuelle timer ?rligt og giver hurtigere forecast til direktionen.',
    totalBudget: 1900000,
    heroImageUrl: 'https://picsum.photos/seed/shared-services/1200/400',
  },
];

const projectMembers = [
  { key: 'rehab-tracker-platform.sofia-birk', projectKey: 'rehab-tracker-platform', employeeKey: 'sofia-birk', role: 'Projektleder', group: 'projektgruppe', isLead: true },
  { key: 'rehab-tracker-platform.rasmus-lund', projectKey: 'rehab-tracker-platform', employeeKey: 'rasmus-lund', role: 'Data Lead', group: 'projektgruppe', isLead: false },
  { key: 'rehab-tracker-platform.linea-skov', projectKey: 'rehab-tracker-platform', employeeKey: 'linea-skov', role: 'Scrum Master', group: 'projektgruppe', isLead: false },
  { key: 'rehab-tracker-platform.ahmed-yasin', projectKey: 'rehab-tracker-platform', employeeKey: 'ahmed-yasin', role: 'Integrationsarkitekt', group: 'projektgruppe', isLead: false },
  { key: 'rehab-tracker-platform.maria-jorgensen', projectKey: 'rehab-tracker-platform', employeeKey: 'maria-jorgensen', role: 'UX Lead', group: 'projektgruppe', isLead: false },
  { key: 'rehab-tracker-platform.clara-petersen', projectKey: 'rehab-tracker-platform', employeeKey: 'clara-petersen', role: 'IoT Analyst', group: 'projektgruppe', isLead: false },
  { key: 'rehab-tracker-platform.julie-sand', projectKey: 'rehab-tracker-platform', employeeKey: 'julie-sand', role: 'Direktionsrepr?sentant', group: 'styregruppe', isLead: false },

  { key: 'clinical-ai-triage.linea-skov', projectKey: 'clinical-ai-triage', employeeKey: 'linea-skov', role: 'Projektleder', group: 'projektgruppe', isLead: true },
  { key: 'clinical-ai-triage.rasmus-lund', projectKey: 'clinical-ai-triage', employeeKey: 'rasmus-lund', role: 'Lead Data Scientist', group: 'projektgruppe', isLead: false },
  { key: 'clinical-ai-triage.ahmed-yasin', projectKey: 'clinical-ai-triage', employeeKey: 'ahmed-yasin', role: 'Integration Lead', group: 'projektgruppe', isLead: false },
  { key: 'clinical-ai-triage.clara-petersen', projectKey: 'clinical-ai-triage', employeeKey: 'clara-petersen', role: 'Data Analyst', group: 'projektgruppe', isLead: false },
  { key: 'clinical-ai-triage.maria-jorgensen', projectKey: 'clinical-ai-triage', employeeKey: 'maria-jorgensen', role: 'UX Researcher', group: 'projektgruppe', isLead: false },
  { key: 'clinical-ai-triage.julie-sand', projectKey: 'clinical-ai-triage', employeeKey: 'julie-sand', role: 'Forandringsleder', group: 'styregruppe', isLead: false },
  { key: 'clinical-ai-triage.sofia-birk', projectKey: 'clinical-ai-triage', employeeKey: 'sofia-birk', role: 'Programchef', group: 'styregruppe', isLead: false },

  { key: 'shared-services-automation.maja-holm', projectKey: 'shared-services-automation', employeeKey: 'maja-holm', role: 'Programleder', group: 'projektgruppe', isLead: true },
  { key: 'shared-services-automation.frederik-hald', projectKey: 'shared-services-automation', employeeKey: 'frederik-hald', role: 'Automationsspecialist', group: 'projektgruppe', isLead: false },
  { key: 'shared-services-automation.nina-iversen', projectKey: 'shared-services-automation', employeeKey: 'nina-iversen', role: 'QA Lead', group: 'projektgruppe', isLead: false },
  { key: 'shared-services-automation.henrik-vestergaard', projectKey: 'shared-services-automation', employeeKey: 'henrik-vestergaard', role: 'Portef?ljekonsulent', group: 'projektgruppe', isLead: false },
  { key: 'shared-services-automation.emma-kristensen', projectKey: 'shared-services-automation', employeeKey: 'emma-kristensen', role: 'Business Controller', group: 'projektgruppe', isLead: false },
];

const timeEntries = [
  {
    memberKey: 'rehab-tracker-platform.sofia-birk',
    weeks: [
      { key: '2025-W46', planned: 20, actual: 19 },
      { key: '2025-W47', planned: 22, actual: 21 },
      { key: '2025-W48', planned: 20, actual: 20 },
    ],
  },
  {
    memberKey: 'rehab-tracker-platform.rasmus-lund',
    weeks: [
      { key: '2025-W46', planned: 32, actual: 31 },
      { key: '2025-W47', planned: 32, actual: 32 },
      { key: '2025-W48', planned: 30, actual: 29 },
    ],
  },
  {
    memberKey: 'rehab-tracker-platform.linea-skov',
    weeks: [
      { key: '2025-W46', planned: 18, actual: 18 },
      { key: '2025-W47', planned: 18, actual: 18 },
      { key: '2025-W48', planned: 18, actual: 17 },
    ],
  },
  {
    memberKey: 'rehab-tracker-platform.ahmed-yasin',
    weeks: [
      { key: '2025-W46', planned: 32, actual: 31 },
      { key: '2025-W47', planned: 32, actual: 32 },
      { key: '2025-W48', planned: 30, actual: 28 },
    ],
  },
  {
    memberKey: 'rehab-tracker-platform.maria-jorgensen',
    weeks: [
      { key: '2025-W46', planned: 24, actual: 23 },
      { key: '2025-W47', planned: 24, actual: 24 },
      { key: '2025-W48', planned: 25, actual: 25 },
    ],
  },
  {
    memberKey: 'rehab-tracker-platform.clara-petersen',
    weeks: [
      { key: '2025-W46', planned: 20, actual: 19 },
      { key: '2025-W47', planned: 20, actual: 20 },
      { key: '2025-W48', planned: 19, actual: 19 },
    ],
  },
  {
    memberKey: 'rehab-tracker-platform.julie-sand',
    weeks: [
      { key: '2025-W46', planned: 6, actual: 6 },
      { key: '2025-W47', planned: 6, actual: 5 },
      { key: '2025-W48', planned: 6, actual: 6 },
    ],
  },
  {
    memberKey: 'clinical-ai-triage.linea-skov',
    weeks: [
      { key: '2025-W45', planned: 22, actual: 21 },
      { key: '2025-W46', planned: 22, actual: 22 },
      { key: '2025-W47', planned: 21, actual: 21 },
    ],
  },
  {
    memberKey: 'clinical-ai-triage.rasmus-lund',
    weeks: [
      { key: '2025-W45', planned: 34, actual: 33 },
      { key: '2025-W46', planned: 34, actual: 34 },
      { key: '2025-W47', planned: 32, actual: 31 },
    ],
  },
  {
    memberKey: 'clinical-ai-triage.ahmed-yasin',
    weeks: [
      { key: '2025-W45', planned: 26, actual: 26 },
      { key: '2025-W46', planned: 26, actual: 25 },
      { key: '2025-W47', planned: 24, actual: 24 },
    ],
  },
  {
    memberKey: 'clinical-ai-triage.clara-petersen',
    weeks: [
      { key: '2025-W45', planned: 18, actual: 17 },
      { key: '2025-W46', planned: 18, actual: 18 },
      { key: '2025-W47', planned: 18, actual: 17 },
    ],
  },
  {
    memberKey: 'clinical-ai-triage.maria-jorgensen',
    weeks: [
      { key: '2025-W45', planned: 20, actual: 20 },
      { key: '2025-W46', planned: 20, actual: 19 },
      { key: '2025-W47', planned: 19, actual: 19 },
    ],
  },
  {
    memberKey: 'clinical-ai-triage.julie-sand',
    weeks: [
      { key: '2025-W45', planned: 8, actual: 8 },
      { key: '2025-W46', planned: 8, actual: 8 },
      { key: '2025-W47', planned: 8, actual: 7 },
    ],
  },
  {
    memberKey: 'clinical-ai-triage.sofia-birk',
    weeks: [
      { key: '2025-W45', planned: 10, actual: 9 },
      { key: '2025-W46', planned: 10, actual: 10 },
      { key: '2025-W47', planned: 9, actual: 9 },
    ],
  },
  {
    memberKey: 'shared-services-automation.maja-holm',
    weeks: [
      { key: '2025-W44', planned: 24, actual: 23 },
      { key: '2025-W45', planned: 24, actual: 24 },
      { key: '2025-W46', planned: 24, actual: 23 },
    ],
  },
  {
    memberKey: 'shared-services-automation.frederik-hald',
    weeks: [
      { key: '2025-W44', planned: 28, actual: 27 },
      { key: '2025-W45', planned: 28, actual: 28 },
      { key: '2025-W46', planned: 28, actual: 27 },
    ],
  },
  {
    memberKey: 'shared-services-automation.nina-iversen',
    weeks: [
      { key: '2025-W44', planned: 20, actual: 19 },
      { key: '2025-W45', planned: 20, actual: 20 },
      { key: '2025-W46', planned: 20, actual: 19 },
    ],
  },
  {
    memberKey: 'shared-services-automation.henrik-vestergaard',
    weeks: [
      { key: '2025-W44', planned: 18, actual: 18 },
      { key: '2025-W45', planned: 18, actual: 17 },
      { key: '2025-W46', planned: 18, actual: 18 },
    ],
  },
  {
    memberKey: 'shared-services-automation.emma-kristensen',
    weeks: [
      { key: '2025-W44', planned: 16, actual: 15 },
      { key: '2025-W45', planned: 16, actual: 16 },
      { key: '2025-W46', planned: 16, actual: 15 },
    ],
  },
];

const reportTemplates = [
  {
    projectKey: 'rehab-tracker-platform',
    weekKey: '2025-W48',
    statusItems: [
      'Pilot med Middelfart og Aarhus leverer stabile videoforl?b.',
      'Device-hub er deployet i skyen og h?ndterer 280 samtidige forbindelser.',
    ],
    challengeItems: [
      'Hjemmesygeplejen eftersp?rger bedre onboarding materiale til patienter 70+.',
      'Regional sikkerhed kr?ver ekstra logning af videokonsultationer.',
    ],
    nextStepItems: [
      'Planl?g hypercare for f?rste b?lge af patienter.',
      'Fasthold aftale om datadeling med kommunerne.',
    ],
    mainTableRows: [
      { title: 'Leverancer', status: 'green', note: 'Alle kerneflows i mobilappen er gennemtestet.' },
      { title: 'Ressourcer', status: 'yellow', note: 'Ekstern IoT-arkitekt forlader projektet i december.' },
      { title: 'Tidsplan', status: 'green', note: 'Implementering holder juni-go-live.' },
    ],
    risks: [
      { name: 'Patient devices leveres for sent', probability: 3, consequence: 4 },
      { name: 'Kommunal dokumentation ikke godkendt', probability: 2, consequence: 5 },
    ],
    phases: [
      { label: 'Discovery', start: 0, end: 15, highlight: 'completed' },
      { label: 'Design', start: 15, end: 35, highlight: 'completed' },
      { label: 'Udvikling', start: 35, end: 75, highlight: 'active' },
      { label: 'Implementering', start: 75, end: 100, highlight: 'planned' },
    ],
    milestones: [
      { label: 'Sensorpakker klar', position: 45, dueDate: '2025-11-15', status: 'On Track' },
      { label: 'Region Syddanmark pilot', position: 70, dueDate: '2026-02-01', status: 'On Track' },
      { label: 'National udrulning', position: 95, dueDate: '2026-06-30', status: 'On Track' },
    ],
    deliverables: [
      { label: 'Patient onboarding kit', position: 60, checklist: ['Video guides', 'Quick start kort'], startDate: '2025-10-01', endDate: '2025-12-01', status: 'In Progress' },
      { label: 'Device monitoring', position: 75, checklist: ['Alert matrix', 'Drift SOP'], startDate: '2025-11-15', endDate: '2026-01-15', status: 'In Progress' },
      { label: 'Hypercare setup', position: 85, checklist: ['Supportplan', 'Weekendberedskab'], startDate: '2026-01-05', endDate: '2026-03-15', status: 'Pending' },
      { label: 'Evalueringsrapport', position: 95, checklist: ['Dataudtr?k', 'Anbefalinger'], startDate: '2026-03-15', endDate: '2026-05-31', status: 'Pending' },
    ],
    kanban: [
      { content: 'Udarbejd patientvideoer', status: 'doing' },
      { content: 'Forhandle device-SLA', status: 'todo' },
      { content: 'Afslut Aarhus sprintdemo', status: 'done' },
    ],
  },
  {
    projectKey: 'clinical-ai-triage',
    weekKey: '2025-W47',
    statusItems: [
      'Triagemodeller k?rer nu mod realtime data fra Aalborg og Aarhus.',
      'F?rste version af klinisk dashboard er pr?senteret for triageteamene.',
    ],
    challengeItems: [
      'Datasikkerhedsreview kr?ver ekstra anonymisering.',
      'Akutmodtagelsen i Herning mangler uddannede superbrugere.',
    ],
    nextStepItems: [
      'Afklar regulatorisk review med jurateamet.',
      'Planl?g shadow-mode pilot i januar.',
    ],
    mainTableRows: [
      { title: 'Leverancer', status: 'green', note: 'Model 1.3 er valideret med F1-score 0.86.' },
      { title: 'Ressourcer', status: 'yellow', note: 'Data scientist erstattes midlertidigt af konsulent.' },
      { title: 'Tidsplan', status: 'yellow', note: 'Shadow-mode afh?nger af compliance-afklaring.' },
    ],
    risks: [
      { name: 'AI-model opfattes som sort boks', probability: 3, consequence: 4 },
      { name: 'Shadow-mode forsinkes', probability: 2, consequence: 4 },
    ],
    phases: [
      { label: 'Data foundation', start: 0, end: 20, highlight: 'completed' },
      { label: 'Model eksperimenter', start: 20, end: 55, highlight: 'completed' },
      { label: 'Pilot', start: 55, end: 85, highlight: 'active' },
      { label: 'Skalering', start: 85, end: 100, highlight: 'planned' },
    ],
    milestones: [
      { label: 'Datasikkerhed godkendt', position: 40, dueDate: '2025-10-30', status: 'On Track' },
      { label: 'Shadow-mode start', position: 65, dueDate: '2026-01-10', status: 'At Risk' },
      { label: 'Go-live akutmodtagelser', position: 90, dueDate: '2026-03-01', status: 'Planned' },
    ],
    deliverables: [
      { label: 'Explainability toolkit', position: 58, checklist: ['Kliniske scenarier', 'Modelkort'], startDate: '2025-09-01', endDate: '2025-11-15', status: 'In Progress' },
      { label: 'Compliance pakke', position: 72, checklist: ['DPIA opdateret', 'Audit spor'], startDate: '2025-10-20', endDate: '2026-01-05', status: 'In Progress' },
      { label: 'Superbruger program', position: 82, checklist: ['Train-the-trainer', 'Evalueringsskema'], startDate: '2025-12-01', endDate: '2026-02-15', status: 'Pending' },
      { label: 'Driftsaftale', position: 90, checklist: ['On-call plan', 'Service vindue'], startDate: '2026-01-15', endDate: '2026-02-28', status: 'Pending' },
    ],
    kanban: [
      { content: 'Udrul dashboards til Aalborg', status: 'doing' },
      { content: 'Forbered shadow-mode design', status: 'todo' },
      { content: 'Model performance review', status: 'done' },
    ],
  },
  {
    projectKey: 'shared-services-automation',
    weekKey: '2025-W46',
    statusItems: [
      'Power Automate flows synkroniserer kontrakter til DataLake hver nat.',
      'PMO cockpit viser nu alle 68 projekter med baseline og scope.',
    ],
    challengeItems: [
      '?konomi efterlyser mere granularitet p? fordelte timer.',
      'Azure AD app-registrering skal fornyes f?r december.',
    ],
    nextStepItems: [
      'Afhold tr?ning for controllere i uge 49.',
      'Luk testcases for kontraktmodulet.',
    ],
    mainTableRows: [
      { title: 'Leverancer', status: 'green', note: 'Rapportpakken er i UAT med fem teams.' },
      { title: 'Ressourcer', status: 'green', note: 'Teamet udvidet med Business Controller.' },
      { title: 'Tidsplan', status: 'yellow', note: 'Integration til ?konomi forventes 2 uger forsinket.' },
    ],
    risks: [
      { name: 'Masterdata ikke ejes centralt', probability: 3, consequence: 3 },
      { name: 'Automatisering mangler change management', probability: 2, consequence: 4 },
    ],
    phases: [
      { label: 'Analyse', start: 0, end: 20, highlight: 'completed' },
      { label: 'Build', start: 20, end: 65, highlight: 'active' },
      { label: 'UAT', start: 65, end: 85, highlight: 'planned' },
      { label: 'Implementering', start: 85, end: 100, highlight: 'planned' },
    ],
    milestones: [
      { label: 'Automationssprint 2', position: 55, dueDate: '2025-12-01', status: 'On Track' },
      { label: 'Controller tr?ning', position: 75, dueDate: '2026-01-20', status: 'Planned' },
      { label: 'Go-live Sekretariatet', position: 92, dueDate: '2026-01-31', status: 'Planned' },
    ],
    deliverables: [
      { label: 'Kontraktrobot', position: 62, checklist: ['Mapping fil', 'Fallback flow'], startDate: '2025-09-15', endDate: '2025-12-05', status: 'In Progress' },
      { label: 'PMO cockpit', position: 68, checklist: ['Datamodel', 'PowerBI release'], startDate: '2025-10-01', endDate: '2025-12-20', status: 'In Progress' },
      { label: 'Controller tr?ning', position: 80, checklist: ['Agenda', 'Hands-on cases'], startDate: '2025-12-15', endDate: '2026-01-20', status: 'Pending' },
      { label: 'Driftsoverdragelse', position: 92, checklist: ['Runbook', 'Supportaftale'], startDate: '2026-01-05', endDate: '2026-01-31', status: 'Pending' },
    ],
    kanban: [
      { content: 'UAT-test scripts', status: 'doing' },
      { content: 'Organiser tr?ning', status: 'todo' },
      { content: 'Deploy connector v2', status: 'done' },
    ],
  },
];

const ensureDatabaseUrl = () => {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL mangler i konfigurationen.');
    process.exit(1);
  }
};

const upsertWorkspaces = async (client) => {
  const ids = new Map();

  for (const workspace of workspaces) {
    const existing = await client.query(
      `
        SELECT id::text
        FROM workspaces
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
      `,
      [workspace.name],
    );

    const configValue = JSON.stringify(workspace.config ?? {});
    const isActive = workspace.isActive ?? true;

    if (existing.rowCount > 0) {
      const workspaceId = existing.rows[0].id;
      await client.query(
        `
          UPDATE workspaces
          SET name = $2,
              type = $3,
              config = $4::jsonb,
              is_active = $5
          WHERE id = $1::uuid
        `,
        [workspaceId, workspace.name, workspace.type, configValue, isActive],
      );
      ids.set(workspace.key, workspaceId);
    } else {
      const created = await client.query(
        `
          INSERT INTO workspaces (name, type, config, is_active)
          VALUES ($1, $2, $3::jsonb, $4)
          RETURNING id::text
        `,
        [workspace.name, workspace.type, configValue, isActive],
      );
      ids.set(workspace.key, created.rows[0]?.id);
    }
  }

  return ids;
};

const upsertOrganizations = async (client) => {
  const ids = new Map();

  for (const organization of organizations) {
    const result = await client.query(
      `
        INSERT INTO organizations (name, code, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          is_active = EXCLUDED.is_active
        RETURNING id::text
      `,
      [organization.name, organization.code],
    );

    const id = result.rows[0]?.id;
    if (id) {
      ids.set(organization.key, id);
    }
  }

  return ids;
};

const upsertLocations = async (client, organizationIds) => {
  const ids = new Map();

  for (const location of locations) {
    const organizationId = organizationIds.get(location.organizationKey);
    if (!organizationId) {
      continue;
    }

    const existing = await client.query(
      `
        SELECT id::text
        FROM locations
        WHERE code = $1
        LIMIT 1
      `,
      [location.code],
    );

    if (existing.rowCount > 0) {
      const locationId = existing.rows[0].id;
      await client.query(
        `
          UPDATE locations
          SET name = $2,
              organization_id = $3::uuid,
              is_active = true
          WHERE id = $1::uuid
        `,
        [locationId, location.name, organizationId],
      );
      ids.set(location.key, locationId);
    } else {
      const created = await client.query(
        `
          INSERT INTO locations (organization_id, name, code, is_active)
          VALUES ($1::uuid, $2, $3, true)
          RETURNING id::text
        `,
        [organizationId, location.name, location.code],
      );
      ids.set(location.key, created.rows[0]?.id);
    }
  }

  return ids;
};

const upsertEmployees = async (client, workspaceIds, organizationIds, locationIds) => {
  const ids = new Map();

  for (const employee of employees) {
    const workspaceId = workspaceIds.get(employee.workspaceKey) ?? null;
    if (!workspaceId) {
      throw new Error(`Manglende workspace for medarbejder ${employee.key}`);
    }
    const organizationId = employee.organizationKey ? organizationIds.get(employee.organizationKey) ?? null : null;
    const locationId = employee.locationKey ? locationIds.get(employee.locationKey) ?? null : null;

    const result = await client.query(
      `
        INSERT INTO employees (
          name, email, location, workspace_id, organization_id, location_id,
          max_capacity_hours_week, department, job_title, account_enabled
        )
        VALUES ($1, $2, $3, $4::uuid, $5::uuid, $6::uuid, $7, $8, $9, $10)
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          workspace_id = EXCLUDED.workspace_id,
          organization_id = EXCLUDED.organization_id,
          location_id = EXCLUDED.location_id,
          max_capacity_hours_week = EXCLUDED.max_capacity_hours_week,
          department = EXCLUDED.department,
          job_title = EXCLUDED.job_title,
          account_enabled = EXCLUDED.account_enabled
        RETURNING id::text
      `,
      [
        employee.name,
        employee.email,
        employee.location,
        workspaceId,
        organizationId,
        locationId,
        employee.maxCapacity,
        employee.department,
        employee.jobTitle,
        employee.accountEnabled,
      ],
    );

    const id = result.rows[0]?.id;
    if (id) {
      ids.set(employee.key, id);
    }
  }

  return ids;
};

const upsertDemoUsers = async (client, employeeIds, workspaceIds) => {
  if (SKIP_USERS) {
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);

  for (const user of demoUsers) {
    const employeeId = employeeIds.get(user.employeeKey) ?? null;
    const employeeData = employeeLookup.get(user.employeeKey);
    const workspaceId =
      (user.workspaceKey ? workspaceIds.get(user.workspaceKey) : null) ??
      (employeeData ? workspaceIds.get(employeeData.workspaceKey) : null) ??
      null;

    if (!workspaceId) {
      throw new Error(`Manglende workspace for bruger ${user.email}`);
    }

    await client.query(
      `
        INSERT INTO users (name, email, password_hash, role, employee_id, workspace_id, auth_provider)
        VALUES ($1, $2, $3, $4, $5::uuid, $6::uuid, 'local')
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          employee_id = EXCLUDED.employee_id,
          password_hash = EXCLUDED.password_hash,
          workspace_id = EXCLUDED.workspace_id,
          auth_provider = EXCLUDED.auth_provider
      `,
      [user.name, user.email, passwordHash, user.role, employeeId, workspaceId],
    );
  }
};

const upsertProjects = async (client, workspaceIds) => {
  const ids = new Map();

  for (const project of projects) {
    const projectGoal = typeof project.projectGoal === 'string' ? project.projectGoal : null;
    const businessCase = typeof project.businessCase === 'string' ? project.businessCase : null;
    let totalBudget = null;
    if (typeof project.totalBudget === 'number' && Number.isFinite(project.totalBudget)) {
      totalBudget = Math.round(project.totalBudget * 100) / 100;
    }
    const workspaceId = workspaceIds.get(project.workspaceKey) ?? null;
    if (!workspaceId) {
      throw new Error(`Manglende workspace for projekt ${project.key}`);
    }

    const existing = await client.query(
      `
        SELECT id::text
        FROM projects
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
      `,
      [project.name],
    );

    if (existing.rowCount > 0) {
      const projectId = existing.rows[0].id;
      await client.query(
        `
          UPDATE projects
          SET start_date = $2,
              end_date = $3,
              status = $4,
              description = $5,
              project_goal = $6,
              business_case = $7,
              total_budget = $8,
              hero_image_url = $9,
              workspace_id = $10::uuid,
              updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [
          projectId,
          project.startDate,
          project.endDate,
          project.status,
          project.description,
          projectGoal,
          businessCase,
          totalBudget,
          project.heroImageUrl ?? null,
          workspaceId,
        ],
      );
      ids.set(project.key, projectId);
    } else {
      const created = await client.query(
        `
          INSERT INTO projects (name, start_date, end_date, status, description, project_goal, business_case, total_budget, hero_image_url, workspace_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid)
          RETURNING id::text
        `,
        [
          project.name,
          project.startDate,
          project.endDate,
          project.status,
          project.description,
          projectGoal,
          businessCase,
          totalBudget,
          project.heroImageUrl ?? null,
          workspaceId,
        ],
      );
      ids.set(project.key, created.rows[0].id);
    }
  }

  return ids;
};

const upsertProjectMembers = async (client, projectIds, employeeIds) => {
  const ids = new Map();

  for (const member of projectMembers) {
    const projectId = projectIds.get(member.projectKey);
    const employeeId = employeeIds.get(member.employeeKey);

    if (!projectId || !employeeId) {
      continue;
    }

    const result = await client.query(
      `
        INSERT INTO project_members (project_id, employee_id, role, member_group, is_project_lead)
        VALUES ($1::uuid, $2::uuid, $3, $4, $5)
        ON CONFLICT (project_id, employee_id)
        DO UPDATE SET
          role = EXCLUDED.role,
          member_group = EXCLUDED.member_group,
          is_project_lead = EXCLUDED.is_project_lead
        RETURNING id::text
      `,
      [projectId, employeeId, member.role, member.group, member.isLead],
    );

    const id = result.rows[0]?.id;
    if (id) {
      ids.set(member.key, id);
    }
  }

  return ids;
};

const upsertTimeEntries = async (client, memberIds) => {
  for (const entry of timeEntries) {
    const memberId = memberIds.get(entry.memberKey);
    if (!memberId) {
      continue;
    }

    for (const week of entry.weeks) {
      await client.query(
        `
          INSERT INTO project_member_time_entries (project_member_id, week_key, planned_hours, actual_hours)
          VALUES ($1::uuid, $2, $3, $4)
          ON CONFLICT (project_member_id, week_key)
          DO UPDATE SET
            planned_hours = EXCLUDED.planned_hours,
            actual_hours = EXCLUDED.actual_hours
        `,
        [memberId, week.key, week.planned, week.actual],
      );
    }
  }
};

const REPORT_CHILD_TABLES = [
  'report_status_items',
  'report_challenge_items',
  'report_next_step_items',
  'report_main_table_rows',
  'report_phases',
  'report_milestones',
  'report_deliverables',
  'report_kanban_tasks',
];

const upsertProjectWorkstreams = async (client, projectIds) => {
  const map = new Map();
  for (const [projectKey, projectId] of projectIds.entries()) {
    const names = ['Initiering', 'Analyse og udvikling', 'Implementering'];
    const rows = [];
    await client.query('DELETE FROM project_workstreams WHERE project_id = $1::uuid', [projectId]);
    for (let idx = 0; idx < names.length; idx += 1) {
      const streamId = randomUUID();
      const name = names[idx];
      rows.push({ id: streamId, name, order: idx });
      map.set(projectKey, [...(map.get(projectKey) ?? []), { id: streamId, name }]);
    }
    for (const stream of rows) {
      await client.query(
        `
          INSERT INTO project_workstreams (id, project_id, name, sort_order)
          VALUES ($1::uuid, $2::uuid, $3, $4)
          ON CONFLICT (id) DO NOTHING
        `,
        [stream.id, projectId, stream.name, stream.order],
      );
    }
  }
  return map;
};

const seedProjectRisks = async (client, projectIds, employeeIds) => {
  const riskMap = new Map();
  const categories = ['timeline', 'scope', 'resource', 'technical', 'budget'];

  for (const [projectKey, projectId] of projectIds.entries()) {
    const risksForProject = [];
    const ownerId = Array.from(employeeIds.values())[0] ?? null;
    for (let i = 0; i < categories.length; i += 1) {
      const title = `${projectKey} risiko ${i + 1}`;
      const probability = 2 + (i % 3);
      const impact = 2 + ((i + 1) % 3);
      const score = probability * impact;
      const category = categories[i % categories.length];
      const id = randomUUID();
      await client.query(
        `
          INSERT INTO project_risks (
            id, project_id, title, description, probability, impact, score, mitigation_plan_a, mitigation_plan_b,
            owner_id, follow_up_notes, follow_up_frequency, category, last_follow_up_at, due_date, status, is_archived,
            created_by, updated_by
          )
          VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, NULL, NULL, $8::uuid, NULL, NULL, $9, NULL, NULL, 'open', false, NULL, NULL)
          ON CONFLICT (id) DO NOTHING
        `,
        [id, projectId, title, `Seedet risiko for ${projectKey}`, probability, impact, score, ownerId, category],
      );
      risksForProject.push({
        id,
        title,
        description: `Seedet risiko for ${projectKey}`,
        probability,
        impact,
        score,
        category,
        ownerName: null,
        ownerEmail: null,
      });
    }
    riskMap.set(projectKey, risksForProject);
  }
  return riskMap;
};

const seedProjectPlan = async (client, projectIds, workstreamIds) => {
  for (const [projectKey, projectId] of projectIds.entries()) {
    const template = [...reportTemplates]
      .filter((item) => item.projectKey === projectKey)
      .sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0];

    // Guard deletes if tables exist (for first-time runs before migration)
    const tableExists = async (name) => {
      const res = await client.query(`SELECT to_regclass($1) AS reg`, [name]);
      return Boolean(res.rows[0]?.reg);
    };
    if (await tableExists('project_deliverable_checklist')) {
      await client.query(
        `
          DELETE FROM project_deliverable_checklist
          WHERE deliverable_id IN (SELECT id FROM project_deliverables WHERE project_id = $1::uuid)
        `,
        [projectId],
      );
    }
    if (await tableExists('project_deliverables')) {
      await client.query('DELETE FROM project_deliverables WHERE project_id = $1::uuid', [projectId]);
    }
    if (await tableExists('project_milestones')) {
      await client.query('DELETE FROM project_milestones WHERE project_id = $1::uuid', [projectId]);
    }
    if (await tableExists('project_phases')) {
      await client.query('DELETE FROM project_phases WHERE project_id = $1::uuid', [projectId]);
    }

    if (!template) {
      continue;
    }

    const streams = workstreamIds.get(projectKey) ?? [];
    const pickStream = (index = 0) => streams[index % (streams.length || 1)]?.id ?? null;

    // Phases
    for (let index = 0; index < (template.phases ?? []).length; index += 1) {
      const phase = template.phases[index];
      await client.query(
        `
          INSERT INTO project_phases (
            id, project_id, workstream_id, label, start_percentage, end_percentage, highlight, status, sort_order
          )
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, NULL, $8)
        `,
        [randomUUID(), projectId, pickStream(index), phase.label, phase.start, phase.end, phase.highlight ?? null, index],
      );
    }

    // Milestones
    const milestoneIds = [];
    for (let index = 0; index < (template.milestones ?? []).length; index += 1) {
      const milestone = template.milestones[index];
      const milestoneId = randomUUID();
      milestoneIds.push(milestoneId);
      await client.query(
        `
          INSERT INTO project_milestones (
            id, project_id, workstream_id, label, position_percentage, due_date, status
          )
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::date, $7)
        `,
        [milestoneId, projectId, pickStream(index), milestone.label, milestone.position, milestone.dueDate ?? null, milestone.status ?? null],
      );
    }

    // Deliverables + checklist
    for (let index = 0; index < (template.deliverables ?? []).length; index += 1) {
      const deliverable = template.deliverables[index];
      const deliverableId = randomUUID();
      const milestoneId = milestoneIds[index % (milestoneIds.length || 1)] ?? null;
      await client.query(
        `
          INSERT INTO project_deliverables (
            id, project_id, milestone_id, label, position_percentage, status, owner_name, owner_employee_id, description, notes, start_date, end_date, progress
          )
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, NULL, NULL, NULL, NULL, $7::date, $8::date, NULL)
        `,
        [
          deliverableId,
          projectId,
          milestoneId,
          deliverable.label,
          deliverable.position,
          deliverable.status ?? null,
          deliverable.startDate ?? null,
          deliverable.endDate ?? null,
        ],
      );

      for (let idx = 0; idx < (deliverable.checklist ?? []).length; idx += 1) {
        const itemText = deliverable.checklist[idx];
        await client.query(
          `
            INSERT INTO project_deliverable_checklist (id, deliverable_id, position, text, completed)
            VALUES ($1::uuid, $2::uuid, $3, $4, false)
          `,
          [randomUUID(), deliverableId, idx, itemText],
        );
      }
    }
  }
};

const seedReports = async (client, projectIds, workstreamIds, projectRiskMap) => {
  for (const report of reportTemplates) {
    const projectId = projectIds.get(report.projectKey);
    if (!projectId) {
      continue;
    }

    const reportResult = await client.query(
      `
        INSERT INTO reports (project_id, week_key)
        VALUES ($1::uuid, $2)
        ON CONFLICT (project_id, week_key)
        DO UPDATE SET week_key = EXCLUDED.week_key
        RETURNING id
      `,
      [projectId, report.weekKey],
    );

    const reportId = reportResult.rows[0]?.id;
    if (!reportId) {
      continue;
    }

    await client.query(
      `
        DELETE FROM report_deliverable_checklist
        WHERE deliverable_id IN (SELECT id FROM report_deliverables WHERE report_id = $1)
      `,
      [reportId],
    );

    await client.query(
      `
        DELETE FROM report_deliverable_checklist
        WHERE deliverable_id IN (SELECT id FROM report_deliverables WHERE report_id = $1)
      `,
      [reportId],
    );

    for (const table of REPORT_CHILD_TABLES) {
      await client.query(`DELETE FROM ${table} WHERE report_id = $1`, [reportId]);
    }

    const workstreams = workstreamIds.get(report.projectKey) ?? [];
    const pickStream = (index = 0) => workstreams[index % (workstreams.length || 1)]?.id ?? null;

    const insertList = async (items, table) => {
      for (let index = 0; index < (items ?? []).length; index += 1) {
        const item = items[index];
        const id = randomUUID();
        if (table === 'report_status_items') {
          await client.query(
            `INSERT INTO report_status_items (id, report_id, position, content) VALUES ($1::uuid, $2, $3, $4)`,
            [id, reportId, index, item],
          );
        } else if (table === 'report_challenge_items') {
          await client.query(
            `INSERT INTO report_challenge_items (id, report_id, position, content) VALUES ($1::uuid, $2, $3, $4)`,
            [id, reportId, index, item],
          );
        } else if (table === 'report_next_step_items') {
          await client.query(
            `INSERT INTO report_next_step_items (id, report_id, position, content) VALUES ($1::uuid, $2, $3, $4)`,
            [id, reportId, index, item],
          );
        } else if (table === 'report_main_table_rows') {
          await client.query(
            `INSERT INTO report_main_table_rows (id, report_id, position, title, status, note) VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
            [id, reportId, index, item.title, item.status, item.note ?? null],
          );
        }
      }
    };

    await insertList(report.statusItems, 'report_status_items');
    await insertList(report.challengeItems, 'report_challenge_items');
    await insertList(report.nextStepItems, 'report_next_step_items');
    await insertList(report.mainTableRows, 'report_main_table_rows');

    const projectRisks = projectRiskMap.get(report.projectKey) ?? [];
    for (let idx = 0; idx < (report.risks ?? []).length; idx += 1) {
      const risk = report.risks[idx];
      const projectRisk = projectRisks[idx % (projectRisks.length || 1)] ?? null;
      const riskId = randomUUID();
      const probability = risk.probability ?? 1;
      const impact = risk.consequence ?? 1;
      const score = probability * impact;
      await client.query(
        `
          INSERT INTO report_risk_snapshots (
            id, report_id, project_risk_id, title, description, probability, impact, score, category, status,
            owner_name, owner_email, mitigation_plan_a, mitigation_plan_b, follow_up_notes, follow_up_frequency,
            due_date, last_follow_up_at
          )
          VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8, $9, 'open', $10, $11, NULL, NULL, NULL, NULL, NULL, NULL)
        `,
        [
          riskId,
          reportId,
          projectRisk?.id ?? null,
          projectRisk?.title ?? risk.name,
          projectRisk?.description ?? null,
          probability,
          impact,
          score,
          projectRisk?.category ?? 'other',
          projectRisk?.ownerName ?? null,
          projectRisk?.ownerEmail ?? null,
        ],
      );
    }

    for (let index = 0; index < (report.phases ?? []).length; index += 1) {
      const phase = report.phases[index];
      const phaseId = randomUUID();
      const workstreamId = pickStream(index);
      await client.query(
        `
          INSERT INTO report_phases (id, report_id, label, start_percentage, end_percentage, highlight, workstream_id, start_date, end_date, status)
          VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid, NULL, NULL, NULL)
        `,
        [phaseId, reportId, phase.label, phase.start, phase.end, phase.highlight ?? null, workstreamId],
      );
    }

    const milestoneIds = [];
    for (let index = 0; index < (report.milestones ?? []).length; index += 1) {
      const milestone = report.milestones[index];
      const milestoneId = randomUUID();
      const workstreamId = pickStream(index);
      milestoneIds.push(milestoneId);
      await client.query(
        `
          INSERT INTO report_milestones (id, report_id, label, position_percentage, workstream_id, due_date, status)
          VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6::date, $7)
        `,
        [milestoneId, reportId, milestone.label, milestone.position, workstreamId, milestone.dueDate ?? null, milestone.status ?? null],
      );
    }

    const deliverableIds = [];
    for (let index = 0; index < (report.deliverables ?? []).length; index += 1) {
      const deliverable = report.deliverables[index];
      const deliverableId = randomUUID();
      const milestoneId = milestoneIds[index % (milestoneIds.length || 1)] ?? null;
      deliverableIds.push({ id: deliverableId, checklist: deliverable.checklist ?? [] });
      await client.query(
        `
          INSERT INTO report_deliverables (id, report_id, label, position_percentage, milestone_id, status, owner_name, owner_employee_id, description, notes, start_date, end_date, progress)
          VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6, NULL, NULL, NULL, NULL, $7::date, $8::date, NULL)
        `,
        [
          deliverableId,
          reportId,
          deliverable.label,
          deliverable.position,
          milestoneId,
          deliverable.status ?? null,
          deliverable.startDate ?? null,
          deliverable.endDate ?? null,
        ],
      );
    }

    for (const deliverable of deliverableIds) {
      for (let idx = 0; idx < deliverable.checklist.length; idx += 1) {
        const itemText = deliverable.checklist[idx];
        await client.query(
          `
            INSERT INTO report_deliverable_checklist (id, deliverable_id, position, text, completed)
            VALUES ($1::uuid, $2::uuid, $3, $4, $5)
          `,
          [randomUUID(), deliverable.id, idx, itemText, false],
        );
      }
    }

    for (const task of report.kanban ?? []) {
      const createdAt = task.createdAt ?? new Date().toISOString();
      await client.query(
        `
          INSERT INTO report_kanban_tasks (id, report_id, content, status, assignee, due_date, notes, created_at)
          VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7, $8::timestamptz)
        `,
        [randomUUID(), reportId, task.content, task.status, task.assignee ?? null, task.dueDate ?? null, task.notes ?? null, createdAt],
      );
    }
  }
};

const setWorkspaceBaseline = async (client) => {
  await client.query(
    `
      INSERT INTO workspace_settings (id, pmo_baseline_hours_week)
      VALUES ($1::uuid, $2)
      ON CONFLICT (id)
      DO UPDATE SET
        pmo_baseline_hours_week = EXCLUDED.pmo_baseline_hours_week,
        updated_at = NOW(),
        updated_by = NULL
    `,
    [WORKSPACE_SINGLETON_ID, DEFAULT_BASELINE_HOURS],
  );
};

const seedDemoData = async () => {
  ensureDatabaseUrl();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (SHOULD_RESET) {
      await truncateExistingTables(client, TABLES_TO_RESET);
    }

    await setWorkspaceBaseline(client);
    const workspaceIds = await upsertWorkspaces(client);
    const organizationIds = await upsertOrganizations(client);
    const locationIds = await upsertLocations(client, organizationIds);
    const employeeIds = await upsertEmployees(client, workspaceIds, organizationIds, locationIds);
    await upsertDemoUsers(client, employeeIds, workspaceIds);
    const projectIds = await upsertProjects(client, workspaceIds);
    const workstreamIds = await upsertProjectWorkstreams(client, projectIds);
    await seedProjectPlan(client, projectIds, workstreamIds);
    const memberIds = await upsertProjectMembers(client, projectIds, employeeIds);
    await upsertTimeEntries(client, memberIds);
    const projectRiskMap = await seedProjectRisks(client, projectIds, employeeIds);
    await seedReports(client, projectIds, workstreamIds, projectRiskMap);

    await client.query('COMMIT');

    console.log('Demo data seed gennemfoert.');
    console.log(`- Medarbejdere opdateret: ${employeeIds.size}`);
    console.log(`- Projekter opdateret: ${projectIds.size}`);
    console.log(`- Projektdeltagere opdateret: ${memberIds.size}`);
    if (!SKIP_USERS) {
      console.log('- Demo brugere er opdateret med kodeordet "Velkommen2025!"');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed fejlede:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

seedDemoData().catch((error) => {
  console.error('Uventet fejl under seed:', error);
  process.exit(1);
});



