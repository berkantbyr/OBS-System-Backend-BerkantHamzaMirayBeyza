const cron = require('node-cron');
const db = require('../models');
const { Student, Enrollment, CourseSection, Course, User } = db;
const attendanceService = require('../services/attendanceService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Absence Warning Job
 * Runs daily at 02:00
 */
const startAbsenceWarningJob = () => {
  logger.info('⏰ Absence Warning Job scheduled (Daily at 02:00)');

  cron.schedule('0 2 * * *', async () => {
    logger.info('🔄 Running Absence Warning Job...');

    try {
      // Get all active enrollments
      const enrollments = await Enrollment.findAll({
        where: { status: 'enrolled' },
        include: [
          {
            model: Student,
            as: 'student',
            include: [{ model: User, as: 'user', attributes: ['email', 'first_name', 'last_name'] }]
          },
          {
            model: CourseSection,
            as: 'section',
            include: [{ model: Course, as: 'course', attributes: ['code', 'name'] }]
          }
        ]
      });

      logger.info(`🔍 Checking attendance for ${enrollments.length} enrollments`);

      let warningCount = 0;
      let criticalCount = 0;

      for (const enrollment of enrollments) {
        try {
          const stats = await attendanceService.getStudentAttendanceStats(
            enrollment.student_id,
            enrollment.section_id
          );

          // Skip if not enough data
          if (stats.totalSessions < 3) continue;

          if (stats.status === 'critical') {
            // Critical Warning (>30%)
            // TODO: Check if already sent recently to avoid spam (using Redis or DB flag)
            // For now, we rely on emailService log or simple firing

            logger.info(`🚨 Critical Absence Detected: ${enrollment.student.user.email} - ${enrollment.section.course.code}`);

            await emailService.sendCriticalAbsenceWarningEmail(
              enrollment.student.user.email,
              enrollment.student.user.first_name,
              enrollment.section.course.code,
              enrollment.section.course.name,
              stats.attendancePercentage,
              stats.absent,
              stats.totalSessions
            );
            criticalCount++;

          } else if (stats.status === 'warning') {
            // Regular Warning (>20%)

            logger.info(`⚠️ Absence Warning Detected: ${enrollment.student.user.email} - ${enrollment.section.course.code}`);

            await emailService.sendAbsenceWarningEmail(
              enrollment.student.user.email,
              enrollment.student.user.first_name,
              enrollment.section.course.code,
              enrollment.section.course.name,
              stats.attendancePercentage,
              stats.absent,
              stats.totalSessions
            );
            warningCount++;
          }

        } catch (err) {
          logger.error(`Error processing enrollment ${enrollment.id}:`, err);
        }
      }

      logger.info(`✅ Absence Warning Job Completed. Warnings: ${warningCount}, Critical: ${criticalCount}`);

    } catch (error) {
      logger.error('❌ Absence Warning Job Failed:', error);
    }
  });
};

module.exports = startAbsenceWarningJob;
