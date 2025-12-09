/**
 * Migration: Create organizations and locations tables
 * TD-1: Replace hardcoded locations with database tables
 */

export const up = async (pgm) => {
    // Create organizations table
    pgm.createTable('organizations', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        name: {
            type: 'text',
            notNull: true,
        },
        code: {
            type: 'text',
            unique: true,
        },
        is_active: {
            type: 'boolean',
            default: true,
        },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    // Create locations table (optional - some orgs like DGH don't have locations)
    pgm.createTable('locations', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        organization_id: {
            type: 'uuid',
            notNull: true,
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
        name: {
            type: 'text',
            notNull: true,
        },
        code: {
            type: 'text',
        },
        is_active: {
            type: 'boolean',
            default: true,
        },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    // Add foreign key columns to employees (keep existing location TEXT for backward compat)
    pgm.addColumn('employees', {
        organization_id: {
            type: 'uuid',
            references: 'organizations(id)',
        },
        location_id: {
            type: 'uuid',
            references: 'locations(id)',
        },
    });

    // Seed organizations
    pgm.sql(`
    INSERT INTO organizations (name, code) VALUES
      ('Sano', 'SANO'),
      ('Dansk Gigthospital', 'DGH'),
      ('Sekretariatet', 'SEK');
  `);

    // Seed locations (only for Sano - DGH and SEK don't have locations)
    pgm.sql(`
    INSERT INTO locations (organization_id, name, code) VALUES
      ((SELECT id FROM organizations WHERE code = 'SANO'), 'Aarhus', 'AAR'),
      ((SELECT id FROM organizations WHERE code = 'SANO'), 'Middelfart', 'MID'),
      ((SELECT id FROM organizations WHERE code = 'SANO'), 'Skælskør', 'SKA');
  `);

    // Backfill existing employees based on their location TEXT field
    pgm.sql(`
    UPDATE employees SET organization_id = (SELECT id FROM organizations WHERE code = 'SANO')
    WHERE location IN ('Sano Aarhus', 'Sano Middelfart', 'Sano Skælskør');

    UPDATE employees SET organization_id = (SELECT id FROM organizations WHERE code = 'DGH')
    WHERE location = 'Dansk Gigthospital';

    UPDATE employees SET organization_id = (SELECT id FROM organizations WHERE code = 'SEK')
    WHERE location = 'Sekretariatet';

    UPDATE employees SET location_id = (
      SELECT l.id FROM locations l 
      JOIN organizations o ON l.organization_id = o.id 
      WHERE o.code = 'SANO' AND l.code = 'AAR'
    ) WHERE location = 'Sano Aarhus';

    UPDATE employees SET location_id = (
      SELECT l.id FROM locations l 
      JOIN organizations o ON l.organization_id = o.id 
      WHERE o.code = 'SANO' AND l.code = 'MID'
    ) WHERE location = 'Sano Middelfart';

    UPDATE employees SET location_id = (
      SELECT l.id FROM locations l 
      JOIN organizations o ON l.organization_id = o.id 
      WHERE o.code = 'SANO' AND l.code = 'SKA'
    ) WHERE location = 'Sano Skælskør';
  `);

    // Create indexes for faster lookups
    pgm.createIndex('locations', 'organization_id');
    pgm.createIndex('employees', 'organization_id');
    pgm.createIndex('employees', 'location_id');
};

export const down = async (pgm) => {
    pgm.dropIndex('employees', 'location_id');
    pgm.dropIndex('employees', 'organization_id');
    pgm.dropIndex('locations', 'organization_id');
    pgm.dropColumn('employees', ['organization_id', 'location_id']);
    pgm.dropTable('locations');
    pgm.dropTable('organizations');
};
