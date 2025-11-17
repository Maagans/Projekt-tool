export const up = (pgm) => {
  pgm.addColumn('projects', {
    project_goal: { type: 'text' },
    business_case: { type: 'text' },
    total_budget: { type: 'numeric(12,2)' },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('projects', 'total_budget');
  pgm.dropColumn('projects', 'business_case');
  pgm.dropColumn('projects', 'project_goal');
};
