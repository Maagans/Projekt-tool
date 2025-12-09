/**
 * Migration: Create workspaces table and add workspace_id to core tables
 * TD-4: Workspace foundation for multi-tenancy support
 */

export const up = async (pgm) => {
    // Create workspaces table
    pgm.createTable('workspaces', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        name: {
            type: 'text',
            notNull: true,
        },
        type: {
            type: 'text',
            notNull: true,
            comment: 'sekretariat or behandling',
        },
        config: {
            type: 'jsonb',
            default: '{}',
            comment: 'Workspace-specific configuration (e.g., time tracking mode)',
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

    // Seed default workspaces
    pgm.sql(`
    INSERT INTO workspaces (name, type, config) VALUES
      ('Sekretariatet', 'sekretariat', '{"timeMode": "monthly"}'),
      ('Behandlingsstederne', 'behandling', '{"timeMode": "weekly"}');
  `);

    // Add workspace_id to projects
    pgm.addColumn('projects', {
        workspace_id: {
            type: 'uuid',
            references: 'workspaces(id)',
        },
    });

    // Add workspace_id to employees
    pgm.addColumn('employees', {
        workspace_id: {
            type: 'uuid',
            references: 'workspaces(id)',
        },
    });

    // Add workspace_id to users
    pgm.addColumn('users', {
        workspace_id: {
            type: 'uuid',
            references: 'workspaces(id)',
        },
    });

    // Backfill: All existing data belongs to Sekretariatet by default
    pgm.sql(`
    UPDATE projects SET workspace_id = (SELECT id FROM workspaces WHERE type = 'sekretariat');
    UPDATE employees SET workspace_id = (SELECT id FROM workspaces WHERE type = 'sekretariat');
    UPDATE users SET workspace_id = (SELECT id FROM workspaces WHERE type = 'sekretariat');
  `);

    // Create indexes for efficient workspace filtering
    pgm.createIndex('projects', 'workspace_id');
    pgm.createIndex('employees', 'workspace_id');
    pgm.createIndex('users', 'workspace_id');
};

export const down = async (pgm) => {
    pgm.dropIndex('users', 'workspace_id');
    pgm.dropIndex('employees', 'workspace_id');
    pgm.dropIndex('projects', 'workspace_id');
    pgm.dropColumn('users', 'workspace_id');
    pgm.dropColumn('employees', 'workspace_id');
    pgm.dropColumn('projects', 'workspace_id');
    pgm.dropTable('workspaces');
};
