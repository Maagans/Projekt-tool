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
  pgm.createExtension('citext', { ifNotExists: true });

  pgm.sql('DROP INDEX IF EXISTS idx_users_email_unique_ci;');
  pgm.sql('DROP INDEX IF EXISTS idx_employees_email_unique_ci;');

  pgm.alterColumn('users', 'email', { type: 'citext', notNull: true });
  pgm.alterColumn('employees', 'email', { type: 'citext', notNull: true });

  pgm.addConstraint('users', 'users_email_unique_ci', { unique: ['email'] });
  pgm.addConstraint('employees', 'employees_email_unique_ci', { unique: ['email'] });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('users', 'users_email_unique_ci', { ifExists: true });
  pgm.dropConstraint('employees', 'employees_email_unique_ci', { ifExists: true });

  pgm.alterColumn('users', 'email', { type: 'text', notNull: true });
  pgm.alterColumn('employees', 'email', { type: 'text', notNull: true });

  pgm.sql('CREATE UNIQUE INDEX idx_users_email_unique_ci ON users (LOWER(email));');
  pgm.sql('CREATE UNIQUE INDEX idx_employees_email_unique_ci ON employees (LOWER(email));');
};
