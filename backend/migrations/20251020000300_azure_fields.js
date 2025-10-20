/**
 * @type {import("node-pg-migrate").ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumn('employees', {
    azure_ad_id: { type: 'text' },
    department: { type: 'text' },
    job_title: { type: 'text' },
    account_enabled: { type: 'boolean', notNull: true, default: true },
    synced_at: { type: 'timestamptz' },
  });

  pgm.createIndex('employees', 'azure_ad_id', {
    name: 'idx_employees_azure_ad_id_unique',
    unique: true,
    where: 'azure_ad_id IS NOT NULL',
  });
};

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex('employees', 'azure_ad_id', {
    name: 'idx_employees_azure_ad_id_unique',
    ifExists: true,
  });

  pgm.dropColumn('employees', 'synced_at', { ifExists: true });
  pgm.dropColumn('employees', 'account_enabled', { ifExists: true });
  pgm.dropColumn('employees', 'job_title', { ifExists: true });
  pgm.dropColumn('employees', 'department', { ifExists: true });
  pgm.dropColumn('employees', 'azure_ad_id', { ifExists: true });
};
