export const up = (pgm) => {
  pgm.createTable('report_next_step_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    report_id: { type: 'bigint', notNull: true, references: 'reports', onDelete: 'cascade' },
    position: { type: 'integer', notNull: true, default: 0 },
    content: { type: 'text', notNull: true },
  });
};

export const down = (pgm) => {
  pgm.dropTable('report_next_step_items');
};
