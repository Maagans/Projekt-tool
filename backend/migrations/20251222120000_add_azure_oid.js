/**
 * Migration: Add azure_oid to users table for Azure AD SSO
 */

export const up = (pgm) => {
    // Add azure_oid column for linking Azure AD accounts
    pgm.addColumn('users', {
        azure_oid: { type: 'text', unique: true },
    });

    // Create index for faster lookups
    pgm.createIndex('users', 'azure_oid');

    // Also make password_hash nullable for Azure-only users
    pgm.alterColumn('users', 'password_hash', {
        notNull: false,
    });
};

export const down = (pgm) => {
    pgm.dropIndex('users', 'azure_oid');
    pgm.dropColumn('users', 'azure_oid');
    pgm.alterColumn('users', 'password_hash', {
        notNull: true,
    });
};
