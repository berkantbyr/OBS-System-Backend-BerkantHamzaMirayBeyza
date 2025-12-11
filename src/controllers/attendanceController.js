const db = require('../models');
const { AttendanceSession, AttendanceRecord, CourseSection, Course, Faculty, Student, Enrollment, Classroom, ExcuseRequest } = db;
const attendanceService = require('../services/attendanceService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Create attendance session (faculty)
 * POST /api/v1/attendance/sessions
 */
const createSession = async (req, res) => {
  try {
    const { section_id, duration_minutes = 30, geofence_radius = 15 } = req.body;

    // Verify faculty
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty) {
      return res.status(403).json({
        success: false,
        message: 'Öğretim üyesi kaydı bulunamadı',
      });
    }

    // Verify instructor teaches this section
    const section = await CourseSection.findByPk(section_id, {
      include: [
        { model: Course, as: 'course' },
        { model: Classroom, as: 'classroom' },
      ],
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section bulunamadı',
      });
    }

    if (section.instructor_id !== faculty.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu dersin yoklamasını açma yetkiniz yok',
      });
    }

    // Check for existing active session
    const existingSession = await AttendanceSession.findOne({
      where: {
        section_id,
        status: 'active',
      },
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'Bu ders için zaten aktif bir yoklama oturumu var',
        data: { sessionId: existingSession.id },
      });
    }

    // Get classroom GPS coordinates
    let latitude = null;
    let longitude = null;
    if (section.classroom) {
      latitude = section.classroom.latitude;
      longitude = section.classroom.longitude;
    }

    // Calculate times
    const now = new Date();
    const startTime = now.toTimeString().split(' ')[0].substring(0, 5);
    const expiresAt = new Date(now.getTime() + duration_minutes * 60 * 1000);
    const endTime = expiresAt.toTimeString().split(' ')[0].substring(0, 5);

    // Create session
    const session = await AttendanceSession.create({
      section_id,
      instructor_id: faculty.id,
      date: now.toISOString().split('T')[0],
      start_time: startTime,
      end_time: endTime,
      latitude,
      longitude,
      geofence_radius,
      status: 'active',
      expires_at: expiresAt,
    });

    logger.info(`Attendance session created: ${session.id} for section ${section_id}`);

    // Get enrolled student count
    const enrolledCount = await Enrollment.count({
      where: { section_id, status: 'enrolled' },
    });

    res.status(201).json({
      success: true,
      message: 'Yoklama oturumu başlatıldı',
      data: {
        session: {
          id: session.id,
          course: {
            code: section.course.code,
            name: section.course.name,
          },
          sectionNumber: section.section_number,
          date: session.date,
          startTime: session.start_time,
          endTime: session.end_time,
          expiresAt: session.expires_at,
          qrCode: session.qr_code,
          location: {
            latitude: session.latitude,
            longitude: session.longitude,
            radius: session.geofence_radius,
            classroom: section.classroom
              ? `${section.classroom.building} ${section.classroom.room_number}`
              : null,
          },
        },
        enrolledStudents: enrolledCount,
      },
    });
  } catch (error) {
    logger.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Yoklama oturumu oluşturulurken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get session details
 * GET /api/v1/attendance/sessions/:id
 */
const getSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await AttendanceSession.findByPk(id, {
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [
            { model: Course, as: 'course' },
            { model: Classroom, as: 'classroom' },
          ],
        },
        {
          model: Faculty,
          as: 'instructor',
          include: [{ model: db.User, as: 'user', attributes: ['first_name', 'last_name'] }],
        },
      ],
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Yoklama oturumu bulunamadı',
      });
    }

    // Get attendance records
    const records = await AttendanceRecord.findAll({
      where: { session_id: id },
      include: [
        {
          model: Student,
          as: 'student',
          include: [{ model: db.User, as: 'user', attributes: ['first_name', 'last_name'] }],
        },
      ],
    });

    // Get enrolled count
    const enrolledCount = await Enrollment.count({
      where: { section_id: session.section_id, status: 'enrolled' },
    });

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          course: {
            code: session.section.course.code,
            name: session.section.course.name,
          },
          sectionNumber: session.section.section_number,
          instructor: session.instructor
            ? `${session.instructor.user.first_name} ${session.instructor.user.last_name}`
            : null,
          date: session.date,
          startTime: session.start_time,
          endTime: session.end_time,
          expiresAt: session.expires_at,
          status: session.status,
          qrCode: session.qr_code,
          location: {
            latitude: session.latitude,
            longitude: session.longitude,
            radius: session.geofence_radius,
            classroom: session.section.classroom
              ? `${session.section.classroom.building} ${session.section.classroom.room_number}`
              : null,
          },
        },
        statistics: {
          enrolled: enrolledCount,
          present: records.filter((r) => r.status === 'present').length,
          late: records.filter((r) => r.status === 'late').length,
          flagged: records.filter((r) => r.is_flagged).length,
        },
        records: records.map((r) => ({
          id: r.id,
          student: {
            id: r.student.id,
            studentNumber: r.student.student_number,
            name: `${r.student.user.first_name} ${r.student.user.last_name}`,
          },
          checkInTime: r.check_in_time,
          method: r.check_in_method,
          distance: r.distance_from_center,
          status: r.status,
          isFlagged: r.is_flagged,
          flagReason: r.flag_reason,
        })),
      },
    });
  } catch (error) {
    logger.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Oturum detayları alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Close attendance session
 * PUT /api/v1/attendance/sessions/:id/close
 */
const closeSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify faculty
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });

    const session = await AttendanceSession.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Yoklama oturumu bulunamadı',
      });
    }

    if (faculty && session.instructor_id !== faculty.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu oturumu kapatma yetkiniz yok',
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Oturum zaten kapatılmış',
      });
    }

    session.status = 'closed';
    session.end_time = new Date().toTimeString().split(' ')[0].substring(0, 5);
    await session.save();

    logger.info(`Attendance session closed: ${id}`);

    res.json({
      success: true,
      message: 'Yoklama oturumu kapatıldı',
    });
  } catch (error) {
    logger.error('Close session error:', error);
    res.status(500).json({
      success: false,
      message: 'Oturum kapatılırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get instructor's sessions
 * GET /api/v1/attendance/sessions/my-sessions
 */
const getInstructorSessions = async (req, res) => {
  try {
    const { section_id, date_from, date_to, status } = req.query;

    // Verify faculty
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty) {
      return res.status(403).json({
        success: false,
        message: 'Öğretim üyesi kaydı bulunamadı',
      });
    }

    const where = { instructor_id: faculty.id };
    if (section_id) where.section_id = section_id;
    if (status) where.status = status;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date[Op.gte] = date_from;
      if (date_to) where.date[Op.lte] = date_to;
    }

    const sessions = await AttendanceSession.findAll({
      where,
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [{ model: Course, as: 'course', attributes: ['code', 'name'] }],
        },
      ],
      order: [['date', 'DESC'], ['start_time', 'DESC']],
    });

    res.json({
      success: true,
      data: await Promise.all(
        sessions.map(async (s) => {
          const recordCount = await AttendanceRecord.count({ where: { session_id: s.id } });
          const enrolledCount = await Enrollment.count({
            where: { section_id: s.section_id, status: 'enrolled' },
          });

          return {
            id: s.id,
            course: {
              code: s.section.course.code,
              name: s.section.course.name,
            },
            sectionNumber: s.section.section_number,
            date: s.date,
            startTime: s.start_time,
            endTime: s.end_time,
            status: s.status,
            attendanceCount: recordCount,
            enrolledCount,
            attendanceRate: enrolledCount > 0 ? Math.round((recordCount / enrolledCount) * 100) : 0,
          };
        })
      ),
    });
  } catch (error) {
    logger.error('Get instructor sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Oturumlar alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Student check-in
 * POST /api/v1/attendance/sessions/:id/checkin
 */
const checkIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy, qr_code } = req.body;

    // Get student
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    // Determine check-in method
    let method = 'gps';
    if (qr_code) {
      // Verify QR code
      const session = await AttendanceSession.findByPk(id);
      if (session && session.qr_code === qr_code) {
        method = 'qr_code';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz QR kodu',
        });
      }
    }

    const result = await attendanceService.processCheckIn(
      id,
      student.id,
      { latitude, longitude, accuracy },
      method
    );

    logger.info(`Student ${student.student_number} checked in to session ${id}`);

    res.json({
      success: true,
      message: 'Yoklama başarıyla verildi',
      data: {
        status: result.status,
        distance: result.distance,
        checkInTime: result.record.check_in_time,
        isFlagged: result.isFlagged,
        flagReason: result.flagReason,
      },
    });
  } catch (error) {
    logger.error('Check-in error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get student's attendance
 * GET /api/v1/attendance/my-attendance
 */
const getMyAttendance = async (req, res) => {
  try {
    // Get student
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    // Get enrolled courses
    const enrollments = await Enrollment.findAll({
      where: { student_id: student.id, status: 'enrolled' },
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [{ model: Course, as: 'course', attributes: ['code', 'name'] }],
        },
      ],
    });

    const attendance = await Promise.all(
      enrollments.map(async (e) => {
        const stats = await attendanceService.getStudentAttendanceStats(student.id, e.section_id);
        return {
          course: {
            code: e.section.course.code,
            name: e.section.course.name,
          },
          sectionId: e.section_id,
          sectionNumber: e.section.section_number,
          semester: e.section.semester,
          year: e.section.year,
          ...stats,
        };
      })
    );

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    logger.error('Get my attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Yoklama bilgileri alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get attendance report for a section
 * GET /api/v1/attendance/report/:sectionId
 */
const getAttendanceReport = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Verify faculty
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    // Verify instructor teaches this section
    const section = await CourseSection.findByPk(sectionId, {
      include: [{ model: Course, as: 'course' }],
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section bulunamadı',
      });
    }

    if (faculty && section.instructor_id !== faculty.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu dersin raporunu görme yetkiniz yok',
      });
    }

    const report = await attendanceService.getSectionAttendanceReport(sectionId);

    res.json({
      success: true,
      data: {
        course: {
          code: section.course.code,
          name: section.course.name,
        },
        sectionNumber: section.section_number,
        semester: section.semester,
        year: section.year,
        students: report,
      },
    });
  } catch (error) {
    logger.error('Get attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Rapor alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get active sessions for student
 * GET /api/v1/attendance/active-sessions
 */
const getActiveSessions = async (req, res) => {
  try {
    // Get student
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    // Get enrolled sections
    const enrollments = await Enrollment.findAll({
      where: { student_id: student.id, status: 'enrolled' },
      attributes: ['section_id'],
    });

    const sectionIds = enrollments.map((e) => e.section_id);

    // Get active sessions for enrolled courses
    const sessions = await AttendanceSession.findAll({
      where: {
        section_id: { [Op.in]: sectionIds },
        status: 'active',
        expires_at: { [Op.gt]: new Date() },
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [
            { model: Course, as: 'course', attributes: ['code', 'name'] },
            { model: Classroom, as: 'classroom', attributes: ['building', 'room_number'] },
          ],
        },
      ],
    });

    // Check which sessions student already checked into
    const checkedSessions = await AttendanceRecord.findAll({
      where: {
        student_id: student.id,
        session_id: { [Op.in]: sessions.map((s) => s.id) },
      },
      attributes: ['session_id'],
    });

    const checkedSessionIds = new Set(checkedSessions.map((c) => c.session_id));

    res.json({
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        course: {
          code: s.section.course.code,
          name: s.section.course.name,
        },
        sectionNumber: s.section.section_number,
        classroom: s.section.classroom
          ? `${s.section.classroom.building} ${s.section.classroom.room_number}`
          : null,
        date: s.date,
        startTime: s.start_time,
        expiresAt: s.expires_at,
        location: {
          latitude: s.latitude,
          longitude: s.longitude,
          radius: s.geofence_radius,
        },
        alreadyCheckedIn: checkedSessionIds.has(s.id),
      })),
    });
  } catch (error) {
    logger.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Aktif oturumlar alınırken hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  createSession,
  getSession,
  closeSession,
  getInstructorSessions,
  checkIn,
  getMyAttendance,
  getAttendanceReport,
  getActiveSessions,
};

