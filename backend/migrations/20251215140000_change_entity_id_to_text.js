/**
 * Migration: Change entity_id from UUID to TEXT
 * This allows storing both UUID and integer entity IDs
 */

exports.up = (pgm) => {
    pgm.sql('ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE text USING entity_id::text');
};

exports.down = (pgm) => {
    // Note: This may fail if non-UUID values exist
    pgm.sql('ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE uuid USING entity_id::uuid');
};
