const db = require('../models');
const { AttendanceRecord, AttendanceSession, CourseSection, Student, Course } = db;
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Prediction Service
 * Provides predictions for attendance analytics
 */
class PredictionService {
  /**
   * Predict future attendance rate for a student
   * @param {string} studentId - Student ID
   * @param {string} sectionId - Section ID (optional)
   * @returns {Promise<Object>} Prediction data
   */
  async predictStudentAttendance(studentId, sectionId = null) {
    try {
      // Get historical attendance data
      const where = { student_id: studentId };
      if (sectionId) {
        where['$session.section_id$'] = sectionId;
      }

      const records = await AttendanceRecord.findAll({
        where,
        include: [
          {
            model: AttendanceSession,
            as: 'session',
            attributes: ['id', 'section_id', 'date', 'start_time'],
            include: [
              {
                model: CourseSection,
                as: 'section',
                attributes: ['id', 'course_id'],
                include: [
                  {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'code', 'name'],
                  },
                ],
              },
            ],
          },
        ],
        order: [['check_in_time', 'ASC']],
        limit: 100, // Last 100 records
      });

      if (records.length < 5) {
        return {
          predictedRate: null,
          confidence: 0,
          message: 'Yetersiz veri - en az 5 yoklama kaydı gereklidir',
        };
      }

      // Calculate current attendance rate
      const totalSessions = records.length;
      const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
      const currentRate = (presentCount / totalSessions) * 100;

      // Calculate trend (recent vs older)
      const recentCount = Math.min(10, Math.floor(totalSessions / 2));
      const recentRecords = records.slice(-recentCount);
      const olderRecords = records.slice(0, totalSessions - recentCount);

      const recentPresent = recentRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const olderPresent = olderRecords.filter(r => r.status === 'present' || r.status === 'late').length;

      const recentRate = (recentPresent / recentCount) * 100;
      const olderRate = olderRecords.length > 0 ? (olderPresent / olderRecords.length) * 100 : recentRate;

      // Trend analysis
      const trend = recentRate - olderRate;
      const trendWeight = Math.abs(trend) / 100; // Normalize trend

      // Predict future rate (weighted average: 70% current, 30% trend)
      const predictedRate = Math.max(0, Math.min(100, currentRate + (trend * 0.3)));

      // Calculate confidence based on data quality
      const confidence = Math.min(95, Math.max(50, 
        50 + // Base confidence
        (totalSessions >= 20 ? 20 : totalSessions * 1) + // More data = more confidence
        (Math.abs(trend) < 10 ? 15 : 0) // Stable trend = more confidence
      ));

      // Risk assessment
      let riskLevel = 'low';
      let riskMessage = 'Devam durumunuz iyi görünüyor';
      
      if (predictedRate < 70) {
        riskLevel = 'high';
        riskMessage = 'Yüksek devamsızlık riski - derslere düzenli katılım önerilir';
      } else if (predictedRate < 80) {
        riskLevel = 'medium';
        riskMessage = 'Orta seviye devamsızlık riski - dikkatli olun';
      }

      return {
        predictedRate: Math.round(predictedRate * 10) / 10,
        currentRate: Math.round(currentRate * 10) / 10,
        recentRate: Math.round(recentRate * 10) / 10,
        trend: Math.round(trend * 10) / 10,
        confidence: Math.round(confidence),
        riskLevel,
        riskMessage,
        dataPoints: totalSessions,
        trendDirection: trend > 5 ? 'improving' : trend < -5 ? 'declining' : 'stable',
      };
    } catch (error) {
      logger.error('Error predicting student attendance:', error);
      throw error;
    }
  }

  /**
   * Predict attendance rate for a course section
   * @param {string} sectionId - Section ID
   * @returns {Promise<Object>} Prediction data
   */
  async predictSectionAttendance(sectionId) {
    try {
      const records = await AttendanceRecord.findAll({
        include: [
          {
            model: AttendanceSession,
            as: 'session',
            where: { section_id: sectionId },
            attributes: ['id', 'date', 'start_time'],
          },
        ],
        order: [['check_in_time', 'ASC']],
        limit: 500, // Last 500 records
      });

      if (records.length < 10) {
        return {
          predictedRate: null,
          confidence: 0,
          message: 'Yetersiz veri - en az 10 yoklama kaydı gereklidir',
        };
      }

      // Group by session
      const sessionMap = new Map();
      records.forEach(record => {
        const sessionId = record.session_id;
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            total: 0,
            present: 0,
            late: 0,
            absent: 0,
          });
        }
        const stats = sessionMap.get(sessionId);
        stats.total++;
        if (record.status === 'present' || record.status === 'late') {
          stats.present++;
        } else if (record.status === 'absent') {
          stats.absent++;
        }
      });

      const sessions = Array.from(sessionMap.values());
      const totalSessions = sessions.length;
      const avgAttendanceRate = sessions.reduce((sum, s) => sum + (s.present / s.total * 100), 0) / totalSessions;

      // Calculate trend
      const recentCount = Math.min(5, Math.floor(totalSessions / 2));
      const recentSessions = sessions.slice(-recentCount);
      const olderSessions = sessions.slice(0, totalSessions - recentCount);

      const recentRate = recentSessions.reduce((sum, s) => sum + (s.present / s.total * 100), 0) / recentSessions.length;
      const olderRate = olderSessions.length > 0 
        ? olderSessions.reduce((sum, s) => sum + (s.present / s.total * 100), 0) / olderSessions.length 
        : recentRate;

      const trend = recentRate - olderRate;
      const predictedRate = Math.max(0, Math.min(100, avgAttendanceRate + (trend * 0.3)));

      const confidence = Math.min(90, Math.max(60,
        60 +
        (totalSessions >= 20 ? 20 : totalSessions * 1) +
        (Math.abs(trend) < 5 ? 10 : 0)
      ));

      return {
        predictedRate: Math.round(predictedRate * 10) / 10,
        currentRate: Math.round(avgAttendanceRate * 10) / 10,
        recentRate: Math.round(recentRate * 10) / 10,
        trend: Math.round(trend * 10) / 10,
        confidence: Math.round(confidence),
        totalSessions,
        trendDirection: trend > 3 ? 'improving' : trend < -3 ? 'declining' : 'stable',
      };
    } catch (error) {
      logger.error('Error predicting section attendance:', error);
      throw error;
    }
  }

  /**
   * Predict students at risk of failing due to attendance
   * @param {string} sectionId - Section ID
   * @param {number} threshold - Minimum attendance rate required (default: 70)
   * @returns {Promise<Array>} Array of at-risk students
   */
  async predictAtRiskStudents(sectionId, threshold = 70) {
    try {
      // Get all students enrolled in section
      const enrollments = await db.Enrollment.findAll({
        where: {
          section_id: sectionId,
          status: { [Op.in]: ['enrolled', 'completed'] },
        },
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['id', 'student_number'],
            include: [
              {
                model: db.User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email'],
              },
            ],
          },
        ],
      });

      const predictions = await Promise.all(
        enrollments.map(async (enrollment) => {
          const prediction = await this.predictStudentAttendance(
            enrollment.student_id,
            sectionId
          );

          return {
            studentId: enrollment.student_id,
            studentNumber: enrollment.student.student_number,
            studentName: `${enrollment.student.user.first_name} ${enrollment.student.user.last_name}`,
            email: enrollment.student.user.email,
            currentRate: prediction.currentRate,
            predictedRate: prediction.predictedRate,
            confidence: prediction.confidence,
            riskLevel: prediction.riskLevel,
            isAtRisk: prediction.predictedRate !== null && prediction.predictedRate < threshold,
          };
        })
      );

      // Filter and sort by risk
      return predictions
        .filter(p => p.isAtRisk)
        .sort((a, b) => (a.predictedRate || 0) - (b.predictedRate || 0));
    } catch (error) {
      logger.error('Error predicting at-risk students:', error);
      throw error;
    }
  }
}

module.exports = new PredictionService();

