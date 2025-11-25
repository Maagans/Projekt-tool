export const up = (pgm) => {
  pgm.createTable('project_phases', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'cascade' },
    workstream_id: { type: 'uuid', references: 'project_workstreams', onDelete: 'set null' },
    label: { type: 'text', notNull: true },
    start_date: { type: 'date' },
    end_date: { type: 'date' },
    start_percentage: { type: 'numeric(5,2)' },
    end_percentage: { type: 'numeric(5,2)' },
    highlight: { type: 'text' },
    status: { type: 'text' },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('project_phases', 'chk_project_phases_status', {
    check: "status IS NULL OR status IN ('Planned','Active','Completed')",
  });
  pgm.addConstraint('project_phases', 'chk_project_phases_start_pct', {
    check: 'start_percentage IS NULL OR (start_percentage >= 0 AND start_percentage <= 100)',
  });
  pgm.addConstraint('project_phases', 'chk_project_phases_end_pct', {
    check: 'end_percentage IS NULL OR (end_percentage >= 0 AND end_percentage <= 100)',
  });
  pgm.addIndex('project_phases', ['project_id', 'sort_order']);
  pgm.addIndex('project_phases', ['workstream_id']);

  pgm.createTable('project_milestones', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'cascade' },
    workstream_id: { type: 'uuid', references: 'project_workstreams', onDelete: 'set null' },
    label: { type: 'text', notNull: true },
    due_date: { type: 'date' },
    position_percentage: { type: 'numeric(5,2)' },
    status: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('project_milestones', 'chk_project_milestones_status', {
    check: "status IS NULL OR status IN ('Pending','On Track','Delayed','Completed')",
  });
  pgm.addConstraint('project_milestones', 'chk_project_milestones_position', {
    check: 'position_percentage IS NULL OR (position_percentage >= 0 AND position_percentage <= 100)',
  });
  pgm.addIndex('project_milestones', ['project_id', 'due_date']);
  pgm.addIndex('project_milestones', ['workstream_id']);

  pgm.createTable('project_deliverables', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'cascade' },
    milestone_id: { type: 'uuid', references: 'project_milestones', onDelete: 'set null' },
    label: { type: 'text', notNull: true },
    position_percentage: { type: 'numeric(5,2)' },
    status: { type: 'text' },
    owner_name: { type: 'text' },
    owner_employee_id: { type: 'uuid', references: 'employees', onDelete: 'set null' },
    description: { type: 'text' },
    notes: { type: 'text' },
    start_date: { type: 'date' },
    end_date: { type: 'date' },
    progress: { type: 'numeric(5,2)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('project_deliverables', 'chk_project_deliverables_status', {
    check: "status IS NULL OR status IN ('Pending','In Progress','Completed')",
  });
  pgm.addConstraint('project_deliverables', 'chk_project_deliverables_position', {
    check: 'position_percentage IS NULL OR (position_percentage >= 0 AND position_percentage <= 100)',
  });
  pgm.addConstraint('project_deliverables', 'chk_project_deliverables_progress', {
    check: 'progress IS NULL OR (progress >= 0 AND progress <= 100)',
  });
  pgm.addIndex('project_deliverables', ['project_id']);
  pgm.addIndex('project_deliverables', ['milestone_id']);

  pgm.createTable('project_deliverable_checklist', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    deliverable_id: { type: 'uuid', notNull: true, references: 'project_deliverables', onDelete: 'cascade' },
    position: { type: 'integer', notNull: true, default: 0 },
    text: { type: 'text', notNull: true },
    completed: { type: 'boolean', notNull: true, default: false },
  });
  pgm.addIndex('project_deliverable_checklist', ['deliverable_id', 'position']);
};

export const down = (pgm) => {
  pgm.dropTable('project_deliverable_checklist', { ifExists: true });
  pgm.dropTable('project_deliverables', { ifExists: true });
  pgm.dropTable('project_milestones', { ifExists: true });
  pgm.dropTable('project_phases', { ifExists: true });
};
