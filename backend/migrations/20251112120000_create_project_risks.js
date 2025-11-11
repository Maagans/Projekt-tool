export const up = (pgm) => {
  pgm.createType('project_risk_category', [
    'technical',
    'resource',
    'scope',
    'timeline',
    'budget',
    'compliance',
    'other',
  ]);

  pgm.createType('project_risk_status', ['open', 'monitoring', 'closed']);

  pgm.createTable('project_risks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'cascade' },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    probability: { type: 'smallint', notNull: true, default: 1 },
    impact: { type: 'smallint', notNull: true, default: 1 },
    score: { type: 'smallint', notNull: true, default: 1 },
    mitigation_plan_a: { type: 'text' },
    mitigation_plan_b: { type: 'text' },
    owner_id: { type: 'uuid', references: 'employees', onDelete: 'set null' },
    follow_up_notes: { type: 'text' },
    follow_up_frequency: { type: 'text' },
    category: { type: 'project_risk_category', notNull: true, default: 'other' },
    last_follow_up_at: { type: 'timestamptz' },
    due_date: { type: 'date' },
    status: { type: 'project_risk_status', notNull: true, default: 'open' },
    is_archived: { type: 'boolean', notNull: true, default: false },
    created_by: { type: 'uuid', references: 'users', onDelete: 'set null' },
    updated_by: { type: 'uuid', references: 'users', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('project_risks', 'chk_project_risk_probability', {
    check: 'probability BETWEEN 1 AND 5',
  });
  pgm.addConstraint('project_risks', 'chk_project_risk_impact', {
    check: 'impact BETWEEN 1 AND 5',
  });
  pgm.addConstraint('project_risks', 'chk_project_risk_score', {
    check: 'score BETWEEN 1 AND 25',
  });

  pgm.createTable('project_risk_history', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    project_risk_id: {
      type: 'uuid',
      notNull: true,
      references: 'project_risks',
      onDelete: 'cascade',
    },
    snapshot: { type: 'jsonb', notNull: true },
    change_summary: { type: 'text' },
    changed_by: { type: 'uuid', references: 'users', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('project_risks', 'project_id');
  pgm.createIndex('project_risks', ['project_id', 'status']);
  pgm.createIndex('project_risks', ['project_id', 'category']);
  pgm.createIndex('project_risks', 'owner_id');
};

export const down = (pgm) => {
  pgm.dropIndex('project_risks', 'owner_id', { ifExists: true });
  pgm.dropIndex('project_risks', ['project_id', 'category'], { ifExists: true });
  pgm.dropIndex('project_risks', ['project_id', 'status'], { ifExists: true });
  pgm.dropIndex('project_risks', 'project_id', { ifExists: true });

  pgm.dropTable('project_risk_history', { ifExists: true });
  pgm.dropTable('project_risks', { ifExists: true });

  pgm.dropType('project_risk_status', { ifExists: true });
  pgm.dropType('project_risk_category', { ifExists: true });
};
