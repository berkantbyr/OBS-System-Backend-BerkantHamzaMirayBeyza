const startAbsenceWarningJob = require('./absenceWarningJob');
const startEventReminderJob = require('./eventReminderJob');
const startMealReminderJob = require('./mealReminderJob');
const startAnalyticsAggregationJob = require('./analyticsAggregationJob');
const startDatabaseBackupJob = require('./databaseBackupJob');
const startLogCleanupJob = require('./logCleanupJob');
const logger = require('../utils/logger');

const initializeJobs = () => {
  logger.info('🚀 Initializing Background Jobs...');

  // Part 2 - Absence Warning Job
  startAbsenceWarningJob();
  logger.info('✅ Absence Warning Job initialized');

  // Part 4 - Event Reminder Job
  startEventReminderJob();
  logger.info('✅ Event Reminder Job initialized');

  // Part 4 - Meal Reminder Job
  startMealReminderJob();
  logger.info('✅ Meal Reminder Job initialized');

  // Part 4 - Analytics Aggregation Job
  startAnalyticsAggregationJob();
  logger.info('✅ Analytics Aggregation Job initialized');

  // Part 4 - Database Backup Job (Daily at 02:00)
  startDatabaseBackupJob();
  logger.info('✅ Database Backup Job initialized');

  // Part 4 - Log Cleanup Job (Weekly on Sunday at 03:00)
  startLogCleanupJob();
  logger.info('✅ Log Cleanup Job initialized');

  logger.info('🎉 All Background Jobs initialized successfully!');
};

module.exports = {
  initializeJobs
};

