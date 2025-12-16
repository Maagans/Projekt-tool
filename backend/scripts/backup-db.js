/**
 * Database Backup Script
 * 
 * Creates PostgreSQL backups with automatic cleanup.
 * 
 * Usage:
 *   npm run backup - Create a backup now
 * 
 * Configuration:
 *   - Backups stored in: ./backups/
 *   - Retention: 14 backups (7 days x 2 daily)
 *   - Format: backup-YYYY-MM-DD-HH-mm.sql
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BACKUP_DIR = join(__dirname, '..', 'backups');
const MAX_BACKUPS = 14; // 7 days x 2 daily backups
const BACKUP_PREFIX = 'backup-';

// Common pg_dump locations on Windows
const PG_DUMP_PATHS = [
    process.env.PG_DUMP_PATH,
    'pg_dump', // Use PATH
    'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
];

/**
 * Find pg_dump executable
 */
const findPgDump = () => {
    for (const pgPath of PG_DUMP_PATHS) {
        if (!pgPath) continue;
        try {
            execSync(`"${pgPath}" --version`, { stdio: 'pipe' });
            return pgPath;
        } catch {
            // Try next path
        }
    }
    throw new Error('pg_dump not found. Set PG_DUMP_PATH environment variable.');
};

/**
 * Ensure backup directory exists
 */
const ensureBackupDir = () => {
    if (!existsSync(BACKUP_DIR)) {
        mkdirSync(BACKUP_DIR, { recursive: true });
        logger.info({ path: BACKUP_DIR }, 'Created backup directory');
    }
};

/**
 * Generate backup filename with timestamp
 */
const generateBackupFilename = () => {
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/T/, '-')
        .replace(/:/g, '-')
        .split('.')[0];
    return `${BACKUP_PREFIX}${timestamp}.sql`;
};

/**
 * Get database connection URL for pg_dump
 */
const getDatabaseUrl = () => {
    if (config.databaseUrl) {
        return config.databaseUrl;
    }

    const { dbHost, dbPort, dbName, dbUser, dbPassword } = config;
    return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
};

/**
 * Create a database backup
 */
const createBackup = async () => {
    ensureBackupDir();

    const filename = generateBackupFilename();
    const filepath = join(BACKUP_DIR, filename);
    const dbUrl = getDatabaseUrl();

    logger.info({ filename }, 'Starting database backup...');
    const startTime = Date.now();

    try {
        const pgDump = findPgDump();
        logger.info({ pgDump }, 'Using pg_dump');
        execSync(`"${pgDump}" "${dbUrl}" -f "${filepath}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
            maxBuffer: 1024 * 1024 * 500,
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const stats = statSync(filepath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

        logger.info({
            filename,
            sizeMB,
            durationSeconds: duration
        }, 'Database backup completed');

        return filepath;
    } catch (error) {
        logger.error({ err: error, filename }, 'Database backup failed');
        throw error;
    }
};

/**
 * List existing backups sorted by date (oldest first)
 */
const listBackups = () => {
    if (!existsSync(BACKUP_DIR)) {
        return [];
    }

    return readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith('.sql'))
        .map(f => ({
            filename: f,
            filepath: join(BACKUP_DIR, f),
            mtime: statSync(join(BACKUP_DIR, f)).mtime,
        }))
        .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
};

/**
 * Cleanup old backups, keeping only the most recent MAX_BACKUPS
 */
const cleanupOldBackups = () => {
    const backups = listBackups();
    const toDelete = backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS));

    if (toDelete.length === 0) {
        logger.info({ totalBackups: backups.length, maxBackups: MAX_BACKUPS }, 'No old backups to cleanup');
        return 0;
    }

    for (const backup of toDelete) {
        try {
            unlinkSync(backup.filepath);
            logger.info({ filename: backup.filename }, 'Deleted old backup');
        } catch (error) {
            logger.error({ err: error, filename: backup.filename }, 'Failed to delete backup');
        }
    }

    logger.info({ deletedCount: toDelete.length, remaining: backups.length - toDelete.length }, 'Backup cleanup completed');
    return toDelete.length;
};

/**
 * Main entry point
 */
const main = async () => {
    console.log('='.repeat(50));
    console.log('Database Backup Script');
    console.log(`Backup directory: ${BACKUP_DIR}`);
    console.log(`Max backups: ${MAX_BACKUPS}`);
    console.log('='.repeat(50));

    try {
        await createBackup();
        cleanupOldBackups();

        const backups = listBackups();
        console.log(`\nCurrent backups (${backups.length}/${MAX_BACKUPS}):`);
        backups.forEach(b => {
            const sizeMB = (statSync(b.filepath).size / (1024 * 1024)).toFixed(1);
            console.log(`  - ${b.filename} (${sizeMB} MB)`);
        });

        console.log('\nBackup complete!');
        process.exit(0);
    } catch (error) {
        console.error('\nBackup failed:', error.message);
        process.exit(1);
    }
};

export { createBackup, cleanupOldBackups, listBackups };

main();
