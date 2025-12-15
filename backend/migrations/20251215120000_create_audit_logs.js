/**
 * Migration: Create audit_logs table for tracking user actions
 * Retention: 26 weeks (cleanup handled by scheduled job)
 */

export const up = async (pgm) => {
  // Create audit_logs table
  pgm.createTable('audit_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    user_name: {
      type: 'text',
      notNull: true,
    },
    user_role: {
      type: 'text',
      notNull: true,
    },
    workspace_id: {
      type: 'uuid',
      references: 'workspaces(id)',
      onDelete: 'SET NULL',
    },
    action: {
      type: 'text',
      notNull: true,
      check: "action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED')",
    },
    entity_type: {
      type: 'text',
      notNull: true,
      check: "entity_type IN ('user', 'employee', 'project', 'member', 'timeEntry', 'report', 'risk', 'workspace', 'auth')",
    },
    entity_id: {
      type: 'uuid',
    },
    entity_name: {
      type: 'text',
    },
    description: {
      type: 'text',
      notNull: true,
    },
    ip_address: {
      type: 'inet',
    },
  });

  // Create indexes for efficient querying
  pgm.createIndex('audit_logs', 'created_at');
  pgm.createIndex('audit_logs', 'workspace_id');
  pgm.createIndex('audit_logs', 'user_id');
  pgm.createIndex('audit_logs', 'action');
  pgm.createIndex('audit_logs', 'entity_type');
};

export const down = async (pgm) => {
  pgm.dropIndex('audit_logs', 'entity_type');
  pgm.dropIndex('audit_logs', 'action');
  pgm.dropIndex('audit_logs', 'user_id');
  pgm.dropIndex('audit_logs', 'workspace_id');
  pgm.dropIndex('audit_logs', 'created_at');
  pgm.dropTable('audit_logs');
};
