const SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

export const up = (pgm) => {
  pgm.createTable('workspace_settings', {
    id: { type: 'uuid', primaryKey: true, notNull: true },
    pmo_baseline_hours_week: {
      type: 'numeric(6,2)',
      notNull: true,
      default: 0,
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_by: {
      type: 'uuid',
      references: 'users',
      onDelete: 'set null',
    },
  });

  pgm.addConstraint('workspace_settings', 'workspace_settings_singleton_id_check', {
    check: `id = '${SINGLETON_ID}'`,
  });

  pgm.sql(
    `INSERT INTO workspace_settings (id, pmo_baseline_hours_week)
     VALUES ('${SINGLETON_ID}', 0)
     ON CONFLICT (id) DO NOTHING`,
  );
};

export const down = (pgm) => {
  pgm.dropConstraint('workspace_settings', 'workspace_settings_singleton_id_check', { ifExists: true });
  pgm.dropTable('workspace_settings', { ifExists: true });
};
