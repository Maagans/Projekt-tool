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
  'report_status_items',
  'reports',
  'project_risk_history',
  'project_risks',
  'project_workstreams',
  'project_member_time_entries',
  'project_members',
  'projects',
];

const employees = [
  {
    key: 'maja-holm',
    name: 'Maja Holm',
    email: 'maja.holm@demo.projekt',
    location: 'Sekretariatet',
    maxCapacity: 37,
    department: 'Digitalisering & IT',
    jobTitle: 'Senior Project Manager',
    accountEnabled: true,
  },
  {
    key: 'sofia-birk',
    name: 'Sofia Birk',
    email: 'sofia.birk@demo.projekt',
    location: 'Sekretariatet',
    maxCapacity: 35,
    department: 'Digitalisering & IT',
    jobTitle: 'Program Manager',
    accountEnabled: true,
  },
  {
    key: 'rasmus-lund',
    name: 'Rasmus Lund',
    email: 'rasmus.lund@demo.projekt',
    location: 'Sano Aarhus',
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
    maxCapacity: 30,
    department: 'Innovation Lab',
    jobTitle: 'Scrum Master',
    accountEnabled: true,
  },
  {
    key: 'ahmed-yasin',
    name: 'Ahmed Yasin',
    email: 'ahmed.yasin@demo.projekt',
    location: 'Sano Skælskør',
    maxCapacity: 37,
    department: 'Innovation Lab',
    jobTitle: 'Backend Developer',
    accountEnabled: true,
  },
  {
    key: 'maria-jorgensen',
    name: 'Maria Jorgensen',
    email: 'maria.jorgensen@demo.projekt',
    location: 'Sano Skælskør',
    maxCapacity: 28,
    department: 'Customer Experience',
    jobTitle: 'UX Designer',
    accountEnabled: true,
  },
  {
    key: 'frederik-hald',
    name: 'Frederik Hald',
    email: 'frederik.hald@demo.projekt',
    location: 'Sano Middelfart',
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
    maxCapacity: 34,
    department: 'Finance Transformation',
    jobTitle: 'QA Lead',
    accountEnabled: true,
  },
];

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
    key: 'digital-hr-platform',
    name: 'Digital HR Platform',
    startDate: '2025-07-01',
    endDate: '2026-04-30',
    status: 'active',
    description:
      'Implementerer en samlet HR selvbetjeningsplatform med integration til lon, vagtplaner og kompetenceudvikling.',
  },
  {
    key: 'cloud-data-warehouse',
    name: 'Cloud Data Warehouse Modernisering',
    startDate: '2025-06-01',
    endDate: '2026-03-31',
    status: 'active',
    description:
      'Migrerer virksomhedens BI setup til en moderne cloud data warehouse platform med realtime datastreams.',
  },
  {
    key: 'citizen-engagement-app',
    name: 'Citizen Engagement App',
    startDate: '2025-08-01',
    endDate: '2026-05-31',
    status: 'active',
    description:
      'Udvikler en brugervenlig app til borgere med selvbetjening, push-notifikationer og digitale kvitteringer.',
  },
];

const projectMembers = [
  { key: 'digital-hr-platform.maja-holm', projectKey: 'digital-hr-platform', employeeKey: 'maja-holm', role: 'Projektleder', group: 'projektgruppe', isLead: true },
  { key: 'digital-hr-platform.linea-skov', projectKey: 'digital-hr-platform', employeeKey: 'linea-skov', role: 'Scrum Master', group: 'projektgruppe', isLead: false },
  { key: 'digital-hr-platform.ahmed-yasin', projectKey: 'digital-hr-platform', employeeKey: 'ahmed-yasin', role: 'Backend Udvikler', group: 'projektgruppe', isLead: false },
  { key: 'digital-hr-platform.maria-jorgensen', projectKey: 'digital-hr-platform', employeeKey: 'maria-jorgensen', role: 'UX Designer', group: 'projektgruppe', isLead: false },
  { key: 'digital-hr-platform.julie-sand', projectKey: 'digital-hr-platform', employeeKey: 'julie-sand', role: 'Forandringsleder', group: 'styregruppe', isLead: false },

  { key: 'cloud-data-warehouse.sofia-birk', projectKey: 'cloud-data-warehouse', employeeKey: 'sofia-birk', role: 'Projektleder', group: 'projektgruppe', isLead: true },
  { key: 'cloud-data-warehouse.rasmus-lund', projectKey: 'cloud-data-warehouse', employeeKey: 'rasmus-lund', role: 'Lead Data Engineer', group: 'projektgruppe', isLead: false },
  { key: 'cloud-data-warehouse.frederik-hald', projectKey: 'cloud-data-warehouse', employeeKey: 'frederik-hald', role: 'BI Specialist', group: 'projektgruppe', isLead: false },
  { key: 'cloud-data-warehouse.nina-iversen', projectKey: 'cloud-data-warehouse', employeeKey: 'nina-iversen', role: 'QA Lead', group: 'projektgruppe', isLead: false },

  { key: 'citizen-engagement-app.maja-holm', projectKey: 'citizen-engagement-app', employeeKey: 'maja-holm', role: 'Projektleder', group: 'projektgruppe', isLead: true },
  { key: 'citizen-engagement-app.maria-jorgensen', projectKey: 'citizen-engagement-app', employeeKey: 'maria-jorgensen', role: 'UX Lead', group: 'projektgruppe', isLead: false },
  { key: 'citizen-engagement-app.rasmus-lund', projectKey: 'citizen-engagement-app', employeeKey: 'rasmus-lund', role: 'Integrationsarkitekt', group: 'projektgruppe', isLead: false },
  { key: 'citizen-engagement-app.clara-petersen', projectKey: 'citizen-engagement-app', employeeKey: 'clara-petersen', role: 'Data Analyst', group: 'projektgruppe', isLead: false },
  { key: 'citizen-engagement-app.ahmed-yasin', projectKey: 'citizen-engagement-app', employeeKey: 'ahmed-yasin', role: 'Mobile Udvikler', group: 'projektgruppe', isLead: false },
  { key: 'citizen-engagement-app.linea-skov', projectKey: 'citizen-engagement-app', employeeKey: 'linea-skov', role: 'Scrum Master', group: 'projektgruppe', isLead: false },
  { key: 'citizen-engagement-app.julie-sand', projectKey: 'citizen-engagement-app', employeeKey: 'julie-sand', role: 'Forandringsleder', group: 'styregruppe', isLead: false },
];

const timeEntries = [
  {
    memberKey: 'digital-hr-platform.maja-holm',
    weeks: [
      { key: '2025-W45', planned: 22, actual: 21 },
      { key: '2025-W46', planned: 20, actual: 19 },
      { key: '2025-W47', planned: 18, actual: 18 },
    ],
  },
  {
    memberKey: 'digital-hr-platform.linea-skov',
    weeks: [
      { key: '2025-W45', planned: 18, actual: 17 },
      { key: '2025-W46', planned: 18, actual: 18 },
      { key: '2025-W47', planned: 18, actual: 17 },
    ],
  },
  {
    memberKey: 'digital-hr-platform.ahmed-yasin',
    weeks: [
      { key: '2025-W45', planned: 32, actual: 30 },
      { key: '2025-W46', planned: 32, actual: 31 },
      { key: '2025-W47', planned: 30, actual: 29 },
    ],
  },
  {
    memberKey: 'digital-hr-platform.maria-jorgensen',
    weeks: [
      { key: '2025-W45', planned: 24, actual: 23 },
      { key: '2025-W46', planned: 24, actual: 24 },
      { key: '2025-W47', planned: 22, actual: 21 },
    ],
  },
  {
    memberKey: 'digital-hr-platform.julie-sand',
    weeks: [
      { key: '2025-W45', planned: 6, actual: 5 },
      { key: '2025-W46', planned: 6, actual: 6 },
      { key: '2025-W47', planned: 6, actual: 5 },
    ],
  },
  {
    memberKey: 'cloud-data-warehouse.sofia-birk',
    weeks: [
      { key: '2025-W44', planned: 24, actual: 24 },
      { key: '2025-W45', planned: 24, actual: 25 },
      { key: '2025-W46', planned: 22, actual: 21 },
    ],
  },
  {
    memberKey: 'cloud-data-warehouse.rasmus-lund',
    weeks: [
      { key: '2025-W44', planned: 32, actual: 31 },
      { key: '2025-W45', planned: 32, actual: 33 },
      { key: '2025-W46', planned: 30, actual: 29 },
    ],
  },
  {
    memberKey: 'cloud-data-warehouse.frederik-hald',
    weeks: [
      { key: '2025-W44', planned: 20, actual: 19 },
      { key: '2025-W45', planned: 20, actual: 19 },
      { key: '2025-W46', planned: 18, actual: 17 },
    ],
  },
  {
    memberKey: 'cloud-data-warehouse.nina-iversen',
    weeks: [
      { key: '2025-W44', planned: 20, actual: 18 },
      { key: '2025-W45', planned: 22, actual: 21 },
      { key: '2025-W46', planned: 20, actual: 20 },
    ],
  },
  {
    memberKey: 'citizen-engagement-app.maja-holm',
    weeks: [
      { key: '2025-W45', planned: 20, actual: 19 },
      { key: '2025-W46', planned: 20, actual: 21 },
      { key: '2025-W47', planned: 18, actual: 18 },
    ],
  },
  {
    memberKey: 'citizen-engagement-app.maria-jorgensen',
    weeks: [
      { key: '2025-W45', planned: 26, actual: 25 },
      { key: '2025-W46', planned: 26, actual: 27 },
      { key: '2025-W47', planned: 24, actual: 23 },
    ],
  },
  {
    memberKey: 'citizen-engagement-app.rasmus-lund',
    weeks: [
      { key: '2025-W45', planned: 28, actual: 26 },
      { key: '2025-W46', planned: 28, actual: 28 },
      { key: '2025-W47', planned: 26, actual: 24 },
    ],
  },
  {
    memberKey: 'citizen-engagement-app.clara-petersen',
    weeks: [
      { key: '2025-W45', planned: 22, actual: 21 },
      { key: '2025-W46', planned: 22, actual: 22 },
      { key: '2025-W47', planned: 20, actual: 20 },
    ],
  },
  {
    memberKey: 'citizen-engagement-app.ahmed-yasin',
    weeks: [
      { key: '2025-W45', planned: 30, actual: 29 },
      { key: '2025-W46', planned: 30, actual: 30 },
      { key: '2025-W47', planned: 28, actual: 27 },
    ],
  },
  {
    memberKey: 'citizen-engagement-app.linea-skov',
    weeks: [
      { key: '2025-W45', planned: 18, actual: 18 },
      { key: '2025-W46', planned: 18, actual: 19 },
      { key: '2025-W47', planned: 18, actual: 18 },
    ],
  },
  {
    memberKey: 'citizen-engagement-app.julie-sand',
    weeks: [
      { key: '2025-W45', planned: 6, actual: 5 },
      { key: '2025-W46', planned: 6, actual: 6 },
      { key: '2025-W47', planned: 6, actual: 5 },
    ],
  },
];

const reportTemplates = [
  {
    projectKey: 'digital-hr-platform',
    weekKey: '2025-W47',
    statusItems: [
      'Sprint 6 afsluttet med 92 procent leverancegrad.',
      'Designsystem for medarbejderflows samlet og godkendt.',
    ],
    challengeItems: [
      'Integration til lon-system afventer opdateret API kontrakt.',
      'HR supportteam mangler accepteret overgangsplan.',
    ],
    nextStepItems: [
      'Forbered demo for HR-ledelsen i uge 6.',
      'Planlæg hypercare-setup til pilotafdelingerne.',
    ],
    mainTableRows: [
      { title: 'Leverancer', status: 'yellow', note: 'Integrationer forsinket en uge.' },
      { title: 'Ressourcer', status: 'green', note: 'Teamet er fuldt bemandet.' },
      { title: 'Tidsplan', status: 'green', note: 'Release dato holdes.' },
    ],
    risks: [
      { name: 'Ekstern leverandoer leverer sent', probability: 3, consequence: 4 },
      { name: 'Forandringsledelse undervurderes', probability: 2, consequence: 5 },
    ],
    phases: [
      { label: 'Analyse', start: 0, end: 20, highlight: 'completed' },
      { label: 'Design', start: 20, end: 55, highlight: 'completed' },
      { label: 'Udvikling', start: 55, end: 85, highlight: 'active' },
    ],
    milestones: [
      { label: 'HR uddannelse kickoff', position: 60 },
      { label: 'Pilotafdeling live', position: 85 },
    ],
    deliverables: [
      { label: 'HR support playbook', position: 68, checklist: ['SLA udkast', 'FAQ draft'] },
      { label: 'Pilot evaluering', position: 90, checklist: ['Interview skabelon', 'Rapport kladde'] },
    ],
    kanban: [
      { content: 'Plan for HR supportteam', status: 'doing' },
      { content: 'API kontrakt godkendelser', status: 'doing' },
      { content: 'Afhold brugerworkshop', status: 'done' },
    ],
  },
  {
    projectKey: 'cloud-data-warehouse',
    weekKey: '2025-W46',
    statusItems: [
      'Data pipelines til finans er i pre-prod.',
      'PowerBI rapporter koerer paa den nye platform.',
    ],
    challengeItems: [
      'Data governance council er forsinket med godkendelse af kataloget.',
    ],
    nextStepItems: [
      'Fasthold plan for data steward backfill.',
      'Planlæg onboarding af supportteamet i marts.',
    ],
    mainTableRows: [
      { title: 'Leverancer', status: 'green', note: 'Sprint 9 leverede alle features.' },
      { title: 'Ressourcer', status: 'yellow', note: 'Data steward er sygemeldt.' },
      { title: 'Tidsplan', status: 'green', note: 'Projekt paa plan.' },
    ],
    risks: [
      { name: 'Manglende forankring af data governance', probability: 3, consequence: 4 },
      { name: 'Licensaftaler ikke paaplads', probability: 2, consequence: 3 },
    ],
    phases: [
      { label: 'Analyse', start: 0, end: 25, highlight: 'completed' },
      { label: 'Platform setup', start: 25, end: 60, highlight: 'completed' },
      { label: 'Migration', start: 60, end: 90, highlight: 'active' },
    ],
    milestones: [
      { label: 'Data landing zone', position: 28 },
      { label: 'Finance live', position: 72 },
    ],
    deliverables: [
      { label: 'Data katalog v1', position: 65, checklist: ['Godkendte domæner', 'Kvalitetsregler dokumenteret'] },
      { label: 'Support model', position: 80, checklist: ['On-call rotations', 'Runbook v1'] },
    ],
    kanban: [
      { content: 'Data catalog review', status: 'doing' },
      { content: 'Planlaeg driftsoverdragelse', status: 'todo' },
      { content: 'Pilot BI dashboards', status: 'done' },
    ],
  },
  {
    projectKey: 'citizen-engagement-app',
    weekKey: '2025-W46',
    statusItems: [
      'Beta-release til intern kommunikation gennemfoert.',
      'Feedback fra borgertest er positiv paa navigation og sprog.',
    ],
    challengeItems: [
      'Push notifikationer skal haandtere samtykke korrekt inden produktion.',
      'Supportorganisationen er ikke fuldt bemandet endnu.',
    ],
    nextStepItems: [
      'Gennemfør sikkerhedsgennemgang med IT-sikkerhed.',
      'Planlæg kommunikationskampagne til eksterne brugere.',
    ],
    mainTableRows: [
      { title: 'Leverancer', status: 'green', note: 'Beta indeholder alle kernefunktioner.' },
      { title: 'Ressourcer', status: 'yellow', note: 'App udvikler fratraeder i april.' },
      { title: 'Tidsplan', status: 'green', note: 'Release planlagt til august beholdes.' },
    ],
    risks: [
      { name: 'App store godkendelse forsinkes', probability: 2, consequence: 4 },
      { name: 'Samtykkehaandtering ikke compliant', probability: 3, consequence: 5 },
    ],
    phases: [
      { label: 'Discovery', start: 0, end: 20, highlight: 'completed' },
      { label: 'Design', start: 20, end: 40, highlight: 'completed' },
      { label: 'Udvikling', start: 40, end: 75, highlight: 'active' },
    ],
    milestones: [
      { label: 'Beta release', position: 70 },
      { label: 'Officiel launch', position: 90 },
    ],
    deliverables: [
      { label: 'Kommunikationspakke', position: 72 },
      { label: 'Supportsetup', position: 88 },
    ],
    kanban: [
      { content: 'Implementer push consent flow', status: 'doing' },
      { content: 'Forbered supportmateriale', status: 'todo' },
      { content: 'Afslut beta feedbackrunde', status: 'done' },
    ],
  },
];

const ensureDatabaseUrl = () => {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL mangler i konfigurationen.');
    process.exit(1);
  }
};

const upsertEmployees = async (client) => {
  const ids = new Map();

  for (const employee of employees) {
    const result = await client.query(
      `
        INSERT INTO employees (name, email, location, max_capacity_hours_week, department, job_title, account_enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
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

const upsertDemoUsers = async (client, employeeIds) => {
  if (SKIP_USERS) {
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);

  for (const user of demoUsers) {
    const employeeId = employeeIds.get(user.employeeKey) ?? null;

    await client.query(
      `
        INSERT INTO users (name, email, password_hash, role, employee_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          employee_id = EXCLUDED.employee_id,
          password_hash = EXCLUDED.password_hash
      `,
      [user.name, user.email, passwordHash, user.role, employeeId],
    );
  }
};

const upsertProjects = async (client) => {
  const ids = new Map();

  for (const project of projects) {
    const projectGoal = typeof project.projectGoal === 'string' ? project.projectGoal : null;
    const businessCase = typeof project.businessCase === 'string' ? project.businessCase : null;
    let totalBudget = null;
    if (typeof project.totalBudget === 'number' && Number.isFinite(project.totalBudget)) {
      totalBudget = Math.round(project.totalBudget * 100) / 100;
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
              updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [projectId, project.startDate, project.endDate, project.status, project.description, projectGoal, businessCase, totalBudget, project.heroImageUrl ?? null],
      );
      ids.set(project.key, projectId);
    } else {
      const created = await client.query(
        `
          INSERT INTO projects (name, start_date, end_date, status, description, project_goal, business_case, total_budget, hero_image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id::text
        `,
        [project.name, project.startDate, project.endDate, project.status, project.description, projectGoal, businessCase, totalBudget, project.heroImageUrl ?? null],
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

    const insertList = async (items, table, cols) => {
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
          VALUES ($1::uuid, $2, $3, $4, $5::uuid, NULL, NULL)
        `,
        [milestoneId, reportId, milestone.label, milestone.position, workstreamId],
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
          VALUES ($1::uuid, $2, $3, $4, $5::uuid, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
        `,
        [deliverableId, reportId, deliverable.label, deliverable.position, milestoneId],
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
      await client.query(`TRUNCATE ${TABLES_TO_RESET.join(', ')} RESTART IDENTITY CASCADE`);
    }

    await setWorkspaceBaseline(client);
    const employeeIds = await upsertEmployees(client);
    await upsertDemoUsers(client, employeeIds);
    const projectIds = await upsertProjects(client);
    const workstreamIds = await upsertProjectWorkstreams(client, projectIds);
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
