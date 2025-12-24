const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Log directory path
const LOG_DIR = path.join(__dirname, '../../logs');
const MAX_LOG_AGE_DAYS = 30;

/**
 * Get file age in days
 */
const getFileAgeDays = (filePath) => {
    const stats = fs.statSync(filePath);
    const now = Date.now();
    const fileAge = now - stats.mtimeMs;
    return fileAge / (24 * 60 * 60 * 1000);
};

/**
 * Format bytes to human readable size
 */
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Perform log cleanup
 */
const performLogCleanup = () => {
    if (!fs.existsSync(LOG_DIR)) {
        logger.info('📁 Log directory does not exist, skipping cleanup');
        return { deletedFiles: 0, freedSpace: 0 };
    }

    let deletedFiles = 0;
    let freedSpace = 0;

    try {
        const files = fs.readdirSync(LOG_DIR);

        files.forEach(file => {
            // Only process log files
            if (file.endsWith('.log') || file.match(/\.log\.\d+$/)) {
                const filePath = path.join(LOG_DIR, file);

                try {
                    const ageDays = getFileAgeDays(filePath);

                    if (ageDays > MAX_LOG_AGE_DAYS) {
                        const stats = fs.statSync(filePath);
                        freedSpace += stats.size;

                        fs.unlinkSync(filePath);
                        deletedFiles++;

                        logger.info(`🗑️ Deleted old log file: ${file} (${ageDays.toFixed(1)} days old)`);
                    }
                } catch (err) {
                    logger.warn(`Could not process log file ${file}: ${err.message}`);
                }
            }
        });

        if (deletedFiles > 0) {
            logger.info(`✅ Log cleanup completed: Deleted ${deletedFiles} file(s), freed ${formatBytes(freedSpace)}`);
        } else {
            logger.info('✅ Log cleanup completed: No old log files to delete');
        }

        return { deletedFiles, freedSpace };
    } catch (error) {
        logger.error('Error during log cleanup:', error);
        return { deletedFiles: 0, freedSpace: 0, error };
    }
};

/**
 * Rotate current log files if they exceed size limit
 */
const rotateLargeLogFiles = (maxSizeMB = 50) => {
    if (!fs.existsSync(LOG_DIR)) return;

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const files = fs.readdirSync(LOG_DIR);

    files.forEach(file => {
        if (file.endsWith('.log') && !file.match(/\.log\.\d+$/)) {
            const filePath = path.join(LOG_DIR, file);

            try {
                const stats = fs.statSync(filePath);

                if (stats.size > maxSizeBytes) {
                    const timestamp = Date.now();
                    const rotatedPath = `${filePath}.${timestamp}`;

                    fs.renameSync(filePath, rotatedPath);
                    logger.info(`🔄 Rotated large log file: ${file} (${formatBytes(stats.size)})`);
                }
            } catch (err) {
                logger.warn(`Could not rotate log file ${file}: ${err.message}`);
            }
        }
    });
};

/**
 * Start the log cleanup cron job
 * Runs weekly on Sunday at 3:00 AM
 */
const startLogCleanupJob = () => {
    // Schedule: At 03:00 on Sunday
    cron.schedule('0 3 * * 0', () => {
        logger.info('⏰ Log Cleanup Job triggered');

        try {
            // First, rotate large log files
            rotateLargeLogFiles();

            // Then, cleanup old log files
            performLogCleanup();
        } catch (error) {
            logger.error('Log cleanup job error:', error);
        }
    }, {
        timezone: 'Europe/Istanbul'
    });

    logger.info('📅 Log Cleanup Job scheduled: Weekly on Sunday at 03:00 AM');
};

module.exports = startLogCleanupJob;

// Export for testing
module.exports.performLogCleanup = performLogCleanup;
module.exports.rotateLargeLogFiles = rotateLargeLogFiles;
