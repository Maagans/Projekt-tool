export const up = (pgm) => {
  pgm.createTable('project_workstreams', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'cascade' },
    name: { type: 'text', notNull: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addIndex('project_workstreams', ['project_id', 'sort_order']);
  pgm.addConstraint('project_workstreams', 'project_workstreams_unique_name_per_project', {
    unique: ['project_id', 'name'],
  });

  pgm.addColumns('report_phases', {
    workstream_id: { type: 'uuid', references: 'project_workstreams', onDelete: 'set null' },
    start_date: { type: 'date' },
    end_date: { type: 'date' },
    status: { type: 'text' },
  });
  pgm.addConstraint('report_phases', 'chk_report_phases_status', {
    check: "status IS NULL OR status IN ('Planned','Active','Completed')",
  });

  pgm.addColumns('report_milestones', {
    workstream_id: { type: 'uuid', references: 'project_workstreams', onDelete: 'set null' },
    due_date: { type: 'date' },
    status: { type: 'text' },
  });
  pgm.addConstraint('report_milestones', 'chk_report_milestones_status', {
    check: "status IS NULL OR status IN ('Pending','On Track','Delayed','Completed')",
  });

  pgm.addColumns('report_deliverables', {
    milestone_id: { type: 'uuid', references: 'report_milestones', onDelete: 'set null' },
    status: { type: 'text' },
    owner_name: { type: 'text' },
    owner_employee_id: { type: 'uuid', references: 'employees', onDelete: 'set null' },
    description: { type: 'text' },
    notes: { type: 'text' },
    start_date: { type: 'date' },
    end_date: { type: 'date' },
    progress: { type: 'numeric(5,2)' },
  });
  pgm.addConstraint('report_deliverables', 'chk_report_deliverables_status', {
    check: "status IS NULL OR status IN ('Pending','In Progress','Completed')",
  });
  pgm.addConstraint('report_deliverables', 'chk_report_deliverables_progress', {
    check: 'progress IS NULL OR (progress >= 0 AND progress <= 100)',
  });

  pgm.createTable('report_deliverable_checklist', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    deliverable_id: {
      type: 'uuid',
      notNull: true,
      references: 'report_deliverables',
      onDelete: 'cascade',
    },
    position: { type: 'integer', notNull: true, default: 0 },
    text: { type: 'text', notNull: true },
    completed: { type: 'boolean', notNull: true, default: false },
  });
  pgm.addIndex('report_deliverable_checklist', ['deliverable_id', 'position']);
};

export const down = (pgm) => {
  pgm.dropTable('report_deliverable_checklist');

  pgm.dropConstraint('report_deliverables', 'chk_report_deliverables_progress', { ifExists: true });
  pgm.dropConstraint('report_deliverables', 'chk_report_deliverables_status', { ifExists: true });
  pgm.dropColumns('report_deliverables', [
    'milestone_id',
    'status',
    'owner_name',
    'owner_employee_id',
    'description',
    'notes',
    'start_date',
    'end_date',
    'progress',
  ]);

  pgm.dropConstraint('report_milestones', 'chk_report_milestones_status', { ifExists: true });
  pgm.dropColumns('report_milestones', ['workstream_id', 'due_date', 'status']);

  pgm.dropConstraint('report_phases', 'chk_report_phases_status', { ifExists: true });
  pgm.dropColumns('report_phases', ['workstream_id', 'start_date', 'end_date', 'status']);

  pgm.dropConstraint('project_workstreams', 'project_workstreams_unique_name_per_project', { ifExists: true });
  pgm.dropTable('project_workstreams');
};
