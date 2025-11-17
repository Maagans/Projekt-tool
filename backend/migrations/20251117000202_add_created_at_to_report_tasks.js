export const up = (pgm) => {
  pgm.addColumn('report_kanban_tasks', {
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('report_kanban_tasks', 'created_at');
};
