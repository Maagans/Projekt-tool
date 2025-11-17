export const up = (pgm) => {
  pgm.addColumns('report_kanban_tasks', {
    assignee: { type: 'text' },
    due_date: { type: 'date' },
    notes: { type: 'text' },
  });
};

export const down = (pgm) => {
  pgm.dropColumns('report_kanban_tasks', ['assignee', 'due_date', 'notes']);
};
