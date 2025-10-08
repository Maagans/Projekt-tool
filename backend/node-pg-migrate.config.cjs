module.exports = {
  dir: 'migrations',
  migrationsTable: 'pgmigrations',
  migrationFileExtension: 'cjs',
  createExtensionIfNotExists: ['uuid-ossp', 'pgcrypto'],
};
