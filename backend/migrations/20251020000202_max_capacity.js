/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumn('employees', {
    max_capacity_hours_week: {
      type: 'numeric(6,2)',
      notNull: true,
      default: 0,
    },
  });

  pgm.alterColumn('employees', 'max_capacity_hours_week', {
    default: null,
  });

  pgm.addConstraint('employees', 'chk_employees_max_capacity_nonnegative', {
    check: 'max_capacity_hours_week >= 0',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('employees', 'chk_employees_max_capacity_nonnegative', { ifExists: true });
  pgm.dropColumn('employees', 'max_capacity_hours_week', { ifExists: true });
};
