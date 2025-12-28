const db = require('../models');
const { ExcuseRequest, AttendanceSession, AttendanceRecord, CourseSection, Course, Faculty, Student } = db;
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Create excuse request (student)
 * POST /api/v1/attendance/excuse-requests
 */
const createExcuseRequest = async (req, res) => {
  try {
    const { session_id, reason, excuse_type = 'other' } = req.body;

    // Get student
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    // Verify session exists
    const session = await AttendanceSession.findByPk(session_id, {
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [{ model: Course, as: 'course' }],
        },
      ],
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Yoklama oturumu bulunamadı',
      });
    }

    // Check if student is enrolled in this section
    const enrollment = await db.Enrollment.findOne({
      where: {
        student_id: student.id,
        section_id: session.section_id,
        status: { [Op.in]: ['enrolled', 'completed'] },
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Bu derse kayıtlı değilsiniz',
      });
    }

    // Check if already submitted excuse for this session
    const existingRequest = await ExcuseRequest.findOne({
      where: {
        student_id: student.id,
        session_id,
      },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Bu oturum için zaten mazeret talebiniz var',
        data: { status: existingRequest.status },
      });
    }

    // Get document URL if uploaded
    let document_url = null;
    if (req.file) {
      document_url = `/uploads/excuses/${req.file.filename}`;
    }

    // Create excuse request
    const excuseRequest = await ExcuseRequest.create({
      student_id: student.id,
      session_id,
      reason,
      excuse_type,
      document_url,
      status: 'pending',
    });

    logger.info(`Excuse request created: ${excuseRequest.id} by student ${student.student_number}`);

    res.status(201).json({
      success: true,
      message: 'Mazeret talebi oluşturuldu',
      data: {
        id: excuseRequest.id,
        course: {
          code: session.section.course.code,
          name: session.section.course.name,
        },
        sessionDate: session.date,
        reason: excuseRequest.reason,
        excuseType: excuseRequest.excuse_type,
        status: excuseRequest.status,
        createdAt: excuseRequest.created_at,
      },
    });
  } catch (error) {
    logger.error('Create excuse request error:', error);
    res.status(500).json({
      success: false,
      message: 'Mazeret talebi oluşturulurken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get excuse requests (faculty)
 * GET /api/v1/attendance/excuse-requests
 */
const getExcuseRequests = async (req, res) => {
  try {
    const { section_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Verify faculty
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    // Build where clause
    const where = {};
    if (status) where.status = status;

    // Get sections taught by this faculty
    let sectionIds = [];
    if (faculty) {
      const sections = await CourseSection.findAll({
        where: { instructor_id: faculty.id },
        attributes: ['id'],
      });
      sectionIds = sections.map((s) => s.id);
    }

    // Filter by section if provided
    const sessionWhere = {};
    if (section_id) {
      sessionWhere.section_id = section_id;
    } else if (faculty) {
      sessionWhere.section_id = { [Op.in]: sectionIds };
    }

    const { count, rows: requests } = await ExcuseRequest.findAndCountAll({
      where,
      include: [
        {
          model: AttendanceSession,
          as: 'session',
          where: sessionWhere,
          include: [
            {
              model: CourseSection,
              as: 'section',
              include: [{ model: Course, as: 'course', attributes: ['code', 'name'] }],
            },
          ],
        },
        {
          model: Student,
          as: 'student',
          include: [{ model: db.User, as: 'user', attributes: ['first_name', 'last_name'] }],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        requests: requests.map((r) => ({
          id: r.id,
          student: {
            id: r.student.id,
            studentNumber: r.student.student_number,
            name: `${r.student.user.first_name} ${r.student.user.last_name}`,
          },
          course: {
            code: r.session.section.course.code,
            name: r.session.section.course.name,
          },
          sessionDate: r.session.date,
          reason: r.reason,
          excuseType: r.excuse_type,
          documentUrl: r.document_url,
          status: r.status,
          notes: r.notes,
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at,
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get excuse requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Mazeret talepleri alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Approve excuse request (faculty)
 * PUT /api/v1/attendance/excuse-requests/:id/approve
 */
const approveExcuseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Verify faculty
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const excuseRequest = await ExcuseRequest.findByPk(id, {
      include: [
        {
          model: AttendanceSession,
          as: 'session',
          include: [{ model: CourseSection, as: 'section' }],
        },
      ],
    });

    if (!excuseRequest) {
      return res.status(404).json({
        success: false,
        message: 'Mazeret talebi bulunamadı',
      });
    }

    // Verify instructor teaches this section
    if (faculty && excuseRequest.session.section.instructor_id !== faculty.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu talebi onaylama yetkiniz yok',
      });
    }

    if (excuseRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Bu talep zaten değerlendirilmiş',
      });
    }

    // Update excuse request
    excuseRequest.status = 'approved';
    excuseRequest.reviewed_by = faculty?.id || null;
    excuseRequest.reviewed_at = new Date();
    excuseRequest.notes = notes;
    await excuseRequest.save();

    // Update or create attendance record as excused
    const existingRecord = await AttendanceRecord.findOne({
      where: {
        session_id: excuseRequest.session_id,
        student_id: excuseRequest.student_id,
      },
    });

    if (existingRecord) {
      existingRecord.status = 'excused';
      await existingRecord.save();
    } else {
      await AttendanceRecord.create({
        session_id: excuseRequest.session_id,
        student_id: excuseRequest.student_id,
        check_in_method: 'manual',
        status: 'excused',
      });
    }

    logger.info(`Excuse request approved: ${id} by ${req.user.id}`);

    // Send notification to student
    try {
      const { createNotification } = require('./notificationController');
      const student = await Student.findByPk(excuseRequest.student_id, {
        include: [{ model: db.User, as: 'user' }],
      });

      if (student && student.user) {
        const session = await AttendanceSession.findByPk(excuseRequest.session_id, {
          include: [{ model: CourseSection, as: 'section', include: [{ model: Course, as: 'course' }] }],
        });

        await createNotification(
          student.user.id,
          'Mazeret Talebiniz Onaylandı',
          `${session?.section?.course?.code || ''} - ${session?.section?.course?.name || ''} dersi için ${excuseRequest.session?.date || ''} tarihli mazeret talebiniz onaylandı.`,
          'attendance',
          'success',
          '/attendance/my-attendance'
        );
      }
    } catch (notifError) {
      logger.warn('Error sending excuse approval notification:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Mazeret talebi onaylandı',
    });
  } catch (error) {
    logger.error('Approve excuse request error:', error);
    res.status(500).json({
      success: false,
      message: 'Mazeret talebi onaylanırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Reject excuse request (faculty)
 * PUT /api/v1/attendance/excuse-requests/:id/reject
 */
const rejectExcuseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Verify faculty
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const excuseRequest = await ExcuseRequest.findByPk(id, {
      include: [
        {
          model: AttendanceSession,
          as: 'session',
          include: [{ model: CourseSection, as: 'section' }],
        },
      ],
    });

    if (!excuseRequest) {
      return res.status(404).json({
        success: false,
        message: 'Mazeret talebi bulunamadı',
      });
    }

    // Verify instructor teaches this section
    if (faculty && excuseRequest.session.section.instructor_id !== faculty.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu talebi reddetme yetkiniz yok',
      });
    }

    if (excuseRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Bu talep zaten değerlendirilmiş',
      });
    }

    // Update excuse request
    excuseRequest.status = 'rejected';
    excuseRequest.reviewed_by = faculty?.id || null;
    excuseRequest.reviewed_at = new Date();
    excuseRequest.notes = notes;
    await excuseRequest.save();

    logger.info(`Excuse request rejected: ${id} by ${req.user.id}`);

    // Send notification to student
    try {
      const { createNotification } = require('./notificationController');
      const student = await Student.findByPk(excuseRequest.student_id, {
        include: [{ model: db.User, as: 'user' }],
      });

      if (student && student.user) {
        const session = await AttendanceSession.findByPk(excuseRequest.session_id, {
          include: [{ model: CourseSection, as: 'section', include: [{ model: Course, as: 'course' }] }],
        });

        await createNotification(
          student.user.id,
          'Mazeret Talebiniz Reddedildi',
          `${session?.section?.course?.code || ''} - ${session?.section?.course?.name || ''} dersi için mazeret talebiniz reddedildi.${notes ? ' Sebep: ' + notes : ''}`,
          'attendance',
          'warning',
          '/attendance/my-attendance'
        );
      }
    } catch (notifError) {
      logger.warn('Error sending excuse rejection notification:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Mazeret talebi reddedildi',
    });
  } catch (error) {
    logger.error('Reject excuse request error:', error);
    res.status(500).json({
      success: false,
      message: 'Mazeret talebi reddedilirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get student's excuse requests
 * GET /api/v1/attendance/my-excuse-requests
 */
const getMyExcuseRequests = async (req, res) => {
  try {
    // Get student
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    const requests = await ExcuseRequest.findAll({
      where: { student_id: student.id },
      include: [
        {
          model: AttendanceSession,
          as: 'session',
          include: [
            {
              model: CourseSection,
              as: 'section',
              include: [{ model: Course, as: 'course', attributes: ['code', 'name'] }],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: requests.map((r) => ({
        id: r.id,
        course: {
          code: r.session.section.course.code,
          name: r.session.section.course.name,
        },
        sessionDate: r.session.date,
        reason: r.reason,
        excuseType: r.excuse_type,
        documentUrl: r.document_url,
        status: r.status,
        notes: r.notes,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at,
      })),
    });
  } catch (error) {
    logger.error('Get my excuse requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Mazeret talepleri alınırken hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  createExcuseRequest,
  getExcuseRequests,
  approveExcuseRequest,
  rejectExcuseRequest,
  getMyExcuseRequests,
};






