exports.up = (pgm) => {
  pgm.createType('user_role', ['Administrator', 'Projektleder', 'Teammedlem']);

  pgm.createTable('employees', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true },
    location: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('projects', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'text', notNull: true },
    start_date: { type: 'date', notNull: true },
    end_date: { type: 'date', notNull: true },
    status: { type: 'text', notNull: true, default: pgm.literal("'active'") },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('projects', 'chk_project_dates', 'start_date <= end_date');
  pgm.addConstraint('projects', 'chk_project_status', "status IN ('active', 'completed', 'on-hold')");

  pgm.createTable('project_members', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'cascade' },
    employee_id: { type: 'uuid', notNull: true, references: 'employees', onDelete: 'cascade' },
    role: { type: 'text', notNull: true },
    member_group: { type: 'text', notNull: true, default: pgm.literal("'unassigned'") },
    is_project_lead: { type: 'boolean', notNull: true, default: false },
  });
  pgm.addConstraint('project_members', 'project_members_project_id_employee_id_key', {
    unique: ['project_id', 'employee_id'],
  });
  pgm.addConstraint('project_members', 'chk_member_group', "member_group IN ('styregruppe','projektgruppe','partnere','referencegruppe','unassigned')");

  pgm.createTable('project_member_time_entries', {
    project_member_id: { type: 'uuid', notNull: true, references: 'project_members', onDelete: 'cascade' },
    week_key: { type: 'varchar(10)', notNull: true },
    planned_hours: { type: 'numeric(6,2)', notNull: true, default: 0 },
    actual_hours: { type: 'numeric(6,2)', notNull: true, default: 0 },
  });
  pgm.addConstraint('project_member_time_entries', 'project_member_time_entries_pkey', {
    primaryKey: ['project_member_id', 'week_key'],
  });
  pgm.addConstraint('project_member_time_entries', 'chk_non_negative_hours', 'planned_hours >= 0 AND actual_hours >= 0');

  pgm.createTable('reports', {
    id: { type: 'bigserial', primaryKey: true },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'cascade' },
    week_key: { type: 'varchar(10)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('reports', 'reports_project_id_week_key_key', {
    unique: ['project_id', 'week_key'],
  });
  pgm.createIndex('reports', 'project_id');

  pgm.createTable('report_status_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    position: { type: 'integer', notNull: true, default: 0 },
    content: { type: 'text', notNull: true },
  });

  pgm.createTable('report_challenge_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    position: { type: 'integer', notNull: true, default: 0 },
    content: { type: 'text', notNull: true },
  });

  pgm.createTable('report_main_table_rows', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    position: { type: 'integer', notNull: true, default: 0 },
    title: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true },
    note: { type: 'text' },
  });
  pgm.addConstraint('report_main_table_rows', 'chk_main_row_status', "status IN ('green','yellow','red')");

  pgm.createTable('report_risks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    name: { type: 'text', notNull: true },
    probability: { type: 'smallint', notNull: true },
    consequence: { type: 'smallint', notNull: true },
  });
  pgm.addConstraint('report_risks', 'chk_probability_range', 'probability BETWEEN 1 AND 5');
  pgm.addConstraint('report_risks', 'chk_consequence_range', 'consequence BETWEEN 1 AND 5');

  pgm.createTable('report_phases', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    label: { type: 'text', notNull: true },
    start_percentage: { type: 'numeric(5,2)', notNull: true },
    end_percentage: { type: 'numeric(5,2)', notNull: true },
    highlight: { type: 'text', notNull: true },
  });
  pgm.addConstraint('report_phases', 'chk_phase_range', 'start_percentage BETWEEN 0 AND 100 AND end_percentage BETWEEN 0 AND 100 AND start_percentage <= end_percentage');

  pgm.createTable('report_milestones', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    label: { type: 'text', notNull: true },
    position_percentage: { type: 'numeric(5,2)', notNull: true },
  });
  pgm.addConstraint('report_milestones', 'chk_milestone_range', 'position_percentage BETWEEN 0 AND 100');

  pgm.createTable('report_deliverables', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    label: { type: 'text', notNull: true },
    position_percentage: { type: 'numeric(5,2)', notNull: true },
  });
  pgm.addConstraint('report_deliverables', 'chk_deliverable_range', 'position_percentage BETWEEN 0 AND 100');

  pgm.createTable('report_kanban_tasks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    content: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true },
  });
  pgm.addConstraint('report_kanban_tasks', 'chk_kanban_status', "status IN ('todo','doing','done')");

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true },
    password_hash: { type: 'text', notNull: true },
    role: { type: 'user_role', notNull: true },
    employee_id: { type: 'uuid', references: 'employees', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createFunction('trigger_set_project_timestamp', [], {
    returns: 'trigger',
    language: 'plpgsql',
  }, 'BEGIN\n  NEW.updated_at := NOW();\n  RETURN NEW;\nEND;');
  pgm.createTrigger('projects', 'trg_projects_set_updated', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'trigger_set_project_timestamp',
  });

  pgm.sql('CREATE UNIQUE INDEX idx_users_email_unique_ci ON users (LOWER(email));');
  pgm.sql('CREATE UNIQUE INDEX idx_employees_email_unique_ci ON employees (LOWER(email));');
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_employees_email_unique_ci;');
  pgm.sql('DROP INDEX IF EXISTS idx_users_email_unique_ci;');

  pgm.dropTrigger('projects', 'trg_projects_set_updated', { ifExists: true });
  pgm.dropFunction('trigger_set_project_timestamp', [], { ifExists: true });

  pgm.dropTable('users');
  pgm.dropTable('report_kanban_tasks');
  pgm.dropTable('report_deliverables');
  pgm.dropTable('report_milestones');
  pgm.dropTable('report_phases');
  pgm.dropTable('report_risks');
  pgm.dropTable('report_main_table_rows');
  pgm.dropTable('report_challenge_items');
  pgm.dropTable('report_status_items');
  pgm.dropTable('reports');
  pgm.dropTable('project_member_time_entries');
  pgm.dropTable('project_members');
  pgm.dropTable('projects');
  pgm.dropTable('employees');

  pgm.dropType('user_role');
};
