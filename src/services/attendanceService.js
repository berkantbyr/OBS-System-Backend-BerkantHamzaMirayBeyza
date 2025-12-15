const db = require('../models');
const { AttendanceSession, AttendanceRecord, Enrollment, CourseSection, Student, ExcuseRequest } = db;
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * AttendanceService - Handles GPS distance calculation and spoofing detection
 */
class AttendanceService {
  /**
   * Earth's radius in meters
   */
  EARTH_RADIUS = 6371000;

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} - Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS * c;
  }

  /**
   * Check if student location is within geofence
   * @param {Object} sessionLocation - { latitude, longitude, geofence_radius }
   * @param {Object} studentLocation - { latitude, longitude, accuracy }
   * @returns {Object} - { isWithin, distance, allowedDistance }
   */
  checkGeofence(sessionLocation, studentLocation) {
    const distance = this.calculateDistance(
      parseFloat(sessionLocation.latitude),
      parseFloat(sessionLocation.longitude),
      parseFloat(studentLocation.latitude),
      parseFloat(studentLocation.longitude)
    );

    // Allow buffer for GPS accuracy
    const accuracyBuffer = Math.min(studentLocation.accuracy || 0, 20); // Max 20m buffer
    const allowedDistance = sessionLocation.geofence_radius + accuracyBuffer + 5; // +5m tolerance

    return {
      isWithin: distance <= allowedDistance,
      distance: Math.round(distance),
      allowedDistance: Math.round(allowedDistance),
    };
  }

  /**
   * Detect potential GPS spoofing
   * @param {Object} studentLocation - { latitude, longitude, accuracy }
   * @param {Object} sessionLocation - { latitude, longitude }
   * @param {string} studentId - Student ID for history check
   * @returns {Object} - { isSuspicious, reasons }
   */
  async detectSpoofing(studentLocation, sessionLocation, studentId) {
    const reasons = [];

    // Check 1: Accuracy too good (potential mock location)
    if (studentLocation.accuracy && studentLocation.accuracy < 3) {
      reasons.push('Suspiciously high GPS accuracy');
    }

    // Check 2: Accuracy too poor
    if (studentLocation.accuracy && studentLocation.accuracy > 100) {
      reasons.push('GPS accuracy too poor');
    }

    // Check 3: Check recent attendance records for impossible travel
    const recentRecords = await AttendanceRecord.findAll({
      where: {
        student_id: studentId,
        check_in_time: {
          [Op.gte]: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
        },
      },
      order: [['check_in_time', 'DESC']],
      limit: 1,
    });

    if (recentRecords.length > 0) {
      const lastRecord = recentRecords[0];
      const timeDiff = (Date.now() - new Date(lastRecord.check_in_time).getTime()) / 1000; // seconds
      const distance = this.calculateDistance(
        parseFloat(lastRecord.latitude),
        parseFloat(lastRecord.longitude),
        parseFloat(studentLocation.latitude),
        parseFloat(studentLocation.longitude)
      );

      // Max reasonable speed: 120 km/h = 33.3 m/s
      const maxPossibleDistance = timeDiff * 33.3;

      if (distance > maxPossibleDistance && distance > 100) {
        reasons.push(`Impossible travel: ${Math.round(distance)}m in ${Math.round(timeDiff)}s`);
      }
    }

    // Check 4: Exact same coordinates as session (too perfect)
    if (
      Math.abs(parseFloat(studentLocation.latitude) - parseFloat(sessionLocation.latitude)) < 0.000001 &&
      Math.abs(parseFloat(studentLocation.longitude) - parseFloat(sessionLocation.longitude)) < 0.000001
    ) {
      reasons.push('Coordinates exactly match classroom center');
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Process check-in for a student
   * @param {string} sessionId - Attendance session ID
   * @param {string} studentId - Student ID
   * @param {Object} location - { latitude, longitude, accuracy }
   * @param {string} method - Check-in method (gps, qr_code, manual)
   * @returns {Object} - Check-in result
   */
  async processCheckIn(sessionId, studentId, location, method = 'gps') {
    // Get session
    const session = await AttendanceSession.findByPk(sessionId, {
      include: [{ model: CourseSection, as: 'section' }],
    });

    if (!session) {
      throw new Error('Attendance session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Attendance session is not active');
    }

    // Check expiry
    if (session.expires_at && new Date() > new Date(session.expires_at)) {
      throw new Error('Attendance session has expired');
    }

    // Check if student is enrolled in this section
    const enrollment = await Enrollment.findOne({
      where: {
        student_id: studentId,
        section_id: session.section_id,
        status: 'enrolled',
      },
    });

    if (!enrollment) {
      throw new Error('Student is not enrolled in this course');
    }

    // Check if already checked in
    const existingRecord = await AttendanceRecord.findOne({
      where: { session_id: sessionId, student_id: studentId },
    });

    if (existingRecord) {
      throw new Error('Already checked in for this session');
    }

    let geofenceResult = null;
    let spoofingResult = null;
    let isFlagged = false;
    let flagReason = null;

    // GPS-based check-in validation
    if (method === 'gps' && location && session.latitude && session.longitude) {
      geofenceResult = this.checkGeofence(
        {
          latitude: session.latitude,
          longitude: session.longitude,
          geofence_radius: session.geofence_radius,
        },
        location
      );

      if (!geofenceResult.isWithin) {
        throw new Error(
          `You are ${geofenceResult.distance}m away from the classroom. Maximum allowed distance is ${geofenceResult.allowedDistance}m.`
        );
      }

      // Check for spoofing
      spoofingResult = await this.detectSpoofing(
        location,
        { latitude: session.latitude, longitude: session.longitude },
        studentId
      );

      if (spoofingResult.isSuspicious) {
        isFlagged = true;
        flagReason = spoofingResult.reasons.join('; ');
      }
    }

    // Determine status (late if more than 15 minutes after session start)
    const sessionStartDateTime = new Date(`${session.date}T${session.start_time}`);
    const lateThreshold = new Date(sessionStartDateTime.getTime() + 15 * 60 * 1000);
    const status = new Date() > lateThreshold ? 'late' : 'present';

    // Create attendance record
    const record = await AttendanceRecord.create({
      session_id: sessionId,
      student_id: studentId,
      check_in_time: new Date(),
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
      accuracy: location?.accuracy || null,
      distance_from_center: geofenceResult?.distance || null,
      check_in_method: method,
      is_flagged: isFlagged,
      flag_reason: flagReason,
      status,
    });

    return {
      success: true,
      record,
      distance: geofenceResult?.distance,
      status,
      isFlagged,
      flagReason,
    };
  }

  /**
   * Get attendance statistics for a student in a section
   * @param {string} studentId - Student ID
   * @param {string} sectionId - Section ID
   * @returns {Object} - Attendance stats
   */
  async getStudentAttendanceStats(studentId, sectionId) {
    logger.info(`📊 Getting attendance stats - Student: ${studentId}, Section: ${sectionId}`);

    // Get all sessions for the section
    const sessions = await AttendanceSession.findAll({
      where: {
        section_id: sectionId,
        status: { [Op.in]: ['active', 'closed'] },
      },
    });

    logger.info(`✅ Found ${sessions.length} sessions for section: ${sectionId}`);

    const sessionIds = sessions.map((s) => s.id);

    // If no sessions, return default stats
    if (sessionIds.length === 0) {
      logger.info(`⚠️ No sessions found for section: ${sectionId}, returning default stats`);
      return {
        totalSessions: 0,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        attendancePercentage: 100,
        status: 'ok',
      };
    }

    // Get attendance records for student
    const records = await AttendanceRecord.findAll({
      where: {
        session_id: { [Op.in]: sessionIds },
        student_id: studentId,
      },
    });

    logger.info(`✅ Found ${records.length} attendance records for student: ${studentId}`);

    // Get excused absences
    const excusedRequests = await ExcuseRequest.findAll({
      where: {
        session_id: { [Op.in]: sessionIds },
        student_id: studentId,
        status: 'approved',
      },
    });

    logger.info(`✅ Found ${excusedRequests.length} approved excuse requests`);

    const totalSessions = sessions.length;
    const presentCount = records.filter((r) => r.status === 'present').length;
    const lateCount = records.filter((r) => r.status === 'late').length;
    const excusedCount = excusedRequests.length;
    const absentCount = totalSessions - presentCount - lateCount - excusedCount;

    const attendancePercentage =
      totalSessions > 0 ? Math.round(((presentCount + lateCount + excusedCount) / totalSessions) * 100) : 100;

    // Determine status
    let status = 'ok';
    if (attendancePercentage < 70) {
      status = 'critical'; // >30% absence
    } else if (attendancePercentage < 80) {
      status = 'warning'; // >20% absence
    }

    logger.info(`📈 Attendance stats calculated - Total: ${totalSessions}, Present: ${presentCount}, Late: ${lateCount}, Excused: ${excusedCount}, Absent: ${absentCount}, Percentage: ${attendancePercentage}%, Status: ${status}`);

    return {
      totalSessions,
      present: presentCount,
      late: lateCount,
      excused: excusedCount,
      absent: absentCount,
      attendancePercentage,
      status,
    };
  }

  /**
   * Get attendance report for a section
   * @param {string} sectionId - Section ID
   * @returns {Object} - Section attendance report
   */
  async getSectionAttendanceReport(sectionId) {
    // Get all enrolled students
    const enrollments = await Enrollment.findAll({
      where: {
        section_id: sectionId,
        status: 'enrolled',
      },
      include: [
        {
          model: Student,
          as: 'student',
          required: false,
          include: [{ model: db.User, as: 'user', attributes: ['first_name', 'last_name'], required: false }],
        },
      ],
    });

    const report = [];

    for (const enrollment of enrollments) {
      // Skip if student data is missing
      if (!enrollment.student) {
        continue;
      }

      const stats = await this.getStudentAttendanceStats(enrollment.student_id, sectionId);

      // Check if student has flagged records
      const flaggedRecords = await AttendanceRecord.findAll({
        where: {
          student_id: enrollment.student_id,
          is_flagged: true,
        },
        include: [
          {
            model: AttendanceSession,
            as: 'session',
            where: { section_id: sectionId },
            required: true,
          },
        ],
      });

      report.push({
        studentId: enrollment.student_id,
        studentNumber: enrollment.student.student_number || '-',
        firstName: enrollment.student.user?.first_name || 'Bilinmiyor',
        lastName: enrollment.student.user?.last_name || '',
        ...stats,
        flaggedCount: flaggedRecords.length,
        isFlagged: flaggedRecords.length > 0,
      });
    }

    // Sort by attendance percentage (ascending - worst first)
    report.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    return report;
  }
}

module.exports = new AttendanceService();



