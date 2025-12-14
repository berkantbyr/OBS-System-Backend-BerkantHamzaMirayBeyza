const cron = require('node-cron');
const logger = require('../utils/logger');
const { runAbsenceWarningJob } = require('./absenceWarningJob');

/**
 * Initialize and start all background jobs
 */
const initializeJobs = () => {
  logger.info('🚀 Initializing background jobs...');

  // Absence Warning Job - Runs daily at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('⏰ Running scheduled Absence Warning Job...');
    try {
      const result = await runAbsenceWarningJob();
      logger.info('✅ Scheduled Absence Warning Job completed:', result);
    } catch (error) {
      logger.error('❌ Scheduled Absence Warning Job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Europe/Istanbul',
  });

  logger.info('✅ Background jobs initialized');
  logger.info('   - Absence Warning Job: Daily at 08:00 AM (Europe/Istanbul)');
};

/**
 * Run a specific job manually
 * @param {string} jobName - Name of the job to run
 */
const runJobManually = async (jobName) => {
  switch (jobName) {
    case 'absenceWarning':
      return runAbsenceWarningJob();
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }
};

module.exports = {
  initializeJobs,
  runJobManually,
};
