export const up = (pgm) => {
    pgm.addColumn('users', {
        auth_provider: {
            type: 'text',
            notNull: true,
            default: 'local',
            comment: 'Authentication provider: local | azure_ad',
        },
    });
    pgm.createIndex('users', 'auth_provider');
};

export const down = (pgm) => {
    pgm.dropIndex('users', 'auth_provider', { ifExists: true });
    pgm.dropColumn('users', 'auth_provider');
};
