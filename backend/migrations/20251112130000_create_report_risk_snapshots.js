export const up = (pgm) => {
  pgm.createTable('report_risk_snapshots', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    project_risk_id: { type: 'uuid', references: 'project_risks', onDelete: 'set null' },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    probability: { type: 'smallint', notNull: true },
    impact: { type: 'smallint', notNull: true },
    score: { type: 'smallint', notNull: true },
    category: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'open' },
    owner_name: { type: 'text' },
    owner_email: { type: 'text' },
    mitigation_plan_a: { type: 'text' },
    mitigation_plan_b: { type: 'text' },
    follow_up_notes: { type: 'text' },
    follow_up_frequency: { type: 'text' },
    due_date: { type: 'date' },
    last_follow_up_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('report_risk_snapshots', 'report_id');
  pgm.createIndex('report_risk_snapshots', 'project_risk_id');
};

export const down = (pgm) => {
  pgm.dropIndex('report_risk_snapshots', 'project_risk_id', { ifExists: true });
  pgm.dropIndex('report_risk_snapshots', 'report_id', { ifExists: true });
  pgm.dropTable('report_risk_snapshots', { ifExists: true });
};
