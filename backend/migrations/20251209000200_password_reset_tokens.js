export const up = (pgm) => {
    pgm.createTable('password_reset_tokens', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users',
            onDelete: 'cascade',
        },
        token_hash: {
            type: 'text',
            notNull: true,
            comment: 'SHA-256 hash of the reset token',
        },
        expires_at: {
            type: 'timestamptz',
            notNull: true,
        },
        used_at: {
            type: 'timestamptz',
            comment: 'Timestamp when token was used, NULL if unused',
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('now()'),
        },
    });

    pgm.createIndex('password_reset_tokens', 'user_id');
    pgm.createIndex('password_reset_tokens', 'token_hash');
    pgm.createIndex('password_reset_tokens', 'expires_at');
};

export const down = (pgm) => {
    pgm.dropTable('password_reset_tokens', { ifExists: true });
};
