const startAbsenceWarningJob = require('./absenceWarningJob');
const logger = require('../utils/logger');

const initializeJobs = () => {
  logger.info('🚀 Initializing Background Jobs...');

  // Start Absence Warning Job
  startAbsenceWarningJob();
  logger.info('✅ Absence Warning Job initialized');
};

module.exports = {
  initializeJobs
};
