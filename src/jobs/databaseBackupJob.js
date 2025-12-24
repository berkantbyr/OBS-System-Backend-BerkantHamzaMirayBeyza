const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Backup directory path
const BACKUP_DIR = path.join(__dirname, '../../backups');
const MAX_BACKUP_AGE_DAYS = 7;

/**
 * Ensure backup directory exists
 */
const ensureBackupDir = () => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        logger.info(`📁 Created backup directory: ${BACKUP_DIR}`);
    }
};

/**
 * Generate backup filename with timestamp
 */
const generateBackupFilename = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `backup_${timestamp}.sql`;
};

/**
 * Delete old backup files (older than MAX_BACKUP_AGE_DAYS)
 */
const cleanupOldBackups = () => {
    const now = Date.now();
    const maxAge = MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000;

    try {
        const files = fs.readdirSync(BACKUP_DIR);
        let deletedCount = 0;

        files.forEach(file => {
            if (file.endsWith('.sql')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                const fileAge = now - stats.mtimeMs;

                if (fileAge > maxAge) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    logger.info(`🗑️ Deleted old backup: ${file}`);
                }
            }
        });

        if (deletedCount > 0) {
            logger.info(`✅ Cleaned up ${deletedCount} old backup(s)`);
        }
    } catch (error) {
        logger.error('Error cleaning up old backups:', error);
    }
};

/**
 * Perform database backup
 */
const performBackup = async () => {
    ensureBackupDir();

    const filename = generateBackupFilename();
    const backupPath = path.join(BACKUP_DIR, filename);

    // Get database configuration from environment
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'campus_db';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';

    // Set PGPASSWORD environment variable for pg_dump
    const env = { ...process.env, PGPASSWORD: dbPassword };

    // Build pg_dump command
    const command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupPath}"`;

    logger.info(`🔄 Starting database backup to: ${filename}`);

    return new Promise((resolve, reject) => {
        exec(command, { env }, (error, stdout, stderr) => {
            if (error) {
                logger.error(`❌ Database backup failed: ${error.message}`);
                if (stderr) {
                    logger.error(`Stderr: ${stderr}`);
                }
                reject(error);
                return;
            }

            // Verify backup file was created
            if (fs.existsSync(backupPath)) {
                const stats = fs.statSync(backupPath);
                const sizeKB = (stats.size / 1024).toFixed(2);
                logger.info(`✅ Database backup completed: ${filename} (${sizeKB} KB)`);

                // Cleanup old backups after successful backup
                cleanupOldBackups();
                resolve(backupPath);
            } else {
                logger.error('❌ Backup file was not created');
                reject(new Error('Backup file was not created'));
            }
        });
    });
};

/**
 * Start the database backup cron job
 * Runs daily at 2:00 AM
 */
const startDatabaseBackupJob = () => {
    // Schedule: At 02:00 every day
    cron.schedule('0 2 * * *', async () => {
        logger.info('⏰ Database Backup Job triggered');
        try {
            await performBackup();
        } catch (error) {
            logger.error('Database backup job error:', error);
        }
    }, {
        timezone: 'Europe/Istanbul'
    });

    logger.info('📅 Database Backup Job scheduled: Daily at 02:00 AM');
};

module.exports = startDatabaseBackupJob;

// Export for testing
module.exports.performBackup = performBackup;
module.exports.cleanupOldBackups = cleanupOldBackups;
