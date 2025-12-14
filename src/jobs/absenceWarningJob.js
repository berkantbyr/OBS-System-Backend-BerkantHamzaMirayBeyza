const db = require('../models');
const { Student, Enrollment, CourseSection, Course, User, AttendanceSession, AttendanceRecord, ExcuseRequest } = db;
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { sendAbsenceWarningEmail, sendCriticalAbsenceWarningEmail } = require('../services/emailService');

/**
 * Absence Warning Job
 * Runs daily to check attendance rates and send warnings
 */
class AbsenceWarningJob {
  /**
   * Calculate attendance rate for a student in a section
   * @param {string} studentId - Student ID
   * @param {string} sectionId - Section ID
   * @returns {Object} - { attendanceRate, absenceRate, totalSessions, attended, excused, absent }
   */
  async calculateAttendanceRate(studentId, sectionId) {
    // Get all sessions for the section
    const sessions = await AttendanceSession.findAll({
      where: {
        section_id: sectionId,
        status: { [Op.in]: ['active', 'closed'] },
      },
    });

    if (sessions.length === 0) {
      return {
        attendanceRate: 100,
        absenceRate: 0,
        totalSessions: 0,
        attended: 0,
        excused: 0,
        absent: 0,
      };
    }

    const sessionIds = sessions.map((s) => s.id);

    // Get attendance records
    const records = await AttendanceRecord.findAll({
      where: {
        session_id: { [Op.in]: sessionIds },
        student_id: studentId,
        status: { [Op.in]: ['present', 'late'] },
      },
    });

    // Get approved excuse requests
    const excusedRequests = await ExcuseRequest.findAll({
      where: {
        session_id: { [Op.in]: sessionIds },
        student_id: studentId,
        status: 'approved',
      },
    });

    const totalSessions = sessions.length;
    const attended = records.length;
    const excused = excusedRequests.length;
    const absent = totalSessions - attended - excused;

    const attendanceRate = totalSessions > 0 
      ? Math.round(((attended + excused) / totalSessions) * 100) 
      : 100;
    const absenceRate = 100 - attendanceRate;

    return {
      attendanceRate,
      absenceRate,
      totalSessions,
      attended,
      excused,
      absent,
    };
  }

  /**
   * Check all students and send warnings if needed
   */
  async run() {
    logger.info('🔄 Starting Absence Warning Job...');

    try {
      // Get current semester info
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      let currentSemester;
      if (currentMonth >= 1 && currentMonth <= 5) {
        currentSemester = 'spring';
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        currentSemester = 'summer';
      } else {
        currentSemester = 'fall';
      }

      // Get all active enrollments for current semester
      const enrollments = await Enrollment.findAll({
        where: { status: 'enrolled' },
        include: [
          {
            model: CourseSection,
            as: 'section',
            where: {
              semester: currentSemester,
              year: currentYear,
              is_active: true,
            },
            include: [
              { model: Course, as: 'course', attributes: ['code', 'name'] },
            ],
          },
          {
            model: Student,
            as: 'student',
            include: [
              { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] },
            ],
          },
        ],
      });

      logger.info(`📊 Checking ${enrollments.length} enrollments for attendance warnings`);

      const warnings = [];
      const criticalWarnings = [];

      for (const enrollment of enrollments) {
        try {
          const stats = await this.calculateAttendanceRate(
            enrollment.student_id,
            enrollment.section_id
          );

          // Skip if not enough sessions (at least 3)
          if (stats.totalSessions < 3) {
            continue;
          }

          const studentInfo = {
            studentId: enrollment.student_id,
            studentNumber: enrollment.student.student_number,
            firstName: enrollment.student.user.first_name,
            lastName: enrollment.student.user.last_name,
            email: enrollment.student.user.email,
            courseCode: enrollment.section.course.code,
            courseName: enrollment.section.course.name,
            ...stats,
          };

          // Critical warning: >= 30% absence
          if (stats.absenceRate >= 30) {
            criticalWarnings.push(studentInfo);
          }
          // Warning: >= 20% absence
          else if (stats.absenceRate >= 20) {
            warnings.push(studentInfo);
          }
        } catch (err) {
          logger.warn(`⚠️ Error checking attendance for enrollment ${enrollment.id}:`, err.message);
        }
      }

      // Send warning emails
      logger.info(`📧 Sending ${warnings.length} warning emails and ${criticalWarnings.length} critical warning emails`);

      for (const warning of warnings) {
        try {
          await sendAbsenceWarningEmail(
            warning.email,
            warning.firstName,
            warning.courseCode,
            warning.courseName,
            warning.absenceRate,
            warning.absent,
            warning.totalSessions
          );

          // Log warning
          await this.logWarning(warning, 'warning');

          logger.info(`✅ Warning email sent to ${warning.email} for ${warning.courseCode}`);
        } catch (err) {
          logger.error(`❌ Failed to send warning email to ${warning.email}:`, err.message);
        }
      }

      for (const warning of criticalWarnings) {
        try {
          await sendCriticalAbsenceWarningEmail(
            warning.email,
            warning.firstName,
            warning.courseCode,
            warning.courseName,
            warning.absenceRate,
            warning.absent,
            warning.totalSessions
          );

          // Log warning
          await this.logWarning(warning, 'critical');

          logger.info(`✅ Critical warning email sent to ${warning.email} for ${warning.courseCode}`);
        } catch (err) {
          logger.error(`❌ Failed to send critical warning email to ${warning.email}:`, err.message);
        }
      }

      logger.info('✅ Absence Warning Job completed successfully');

      return {
        success: true,
        warningsSent: warnings.length,
        criticalWarningsSent: criticalWarnings.length,
        totalChecked: enrollments.length,
      };
    } catch (error) {
      logger.error('❌ Absence Warning Job failed:', error);
      throw error;
    }
  }

  /**
   * Log warning to database or file
   * @param {Object} warning - Warning info
   * @param {string} level - Warning level (warning/critical)
   */
  async logWarning(warning, level) {
    // Log to console/file
    logger.info(`[${level.toUpperCase()}] Absence warning for student ${warning.studentNumber}: ${warning.courseCode} - ${warning.absenceRate}% absence rate`);
    
    // Could also save to database if needed
    // await AbsenceWarningLog.create({ ... });
  }
}

// Create singleton instance
const absenceWarningJob = new AbsenceWarningJob();

// Cron job runner function
const runAbsenceWarningJob = async () => {
  return absenceWarningJob.run();
};

module.exports = {
  AbsenceWarningJob,
  runAbsenceWarningJob,
};
