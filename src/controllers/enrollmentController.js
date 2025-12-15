const db = require('../models');
const { Student, Enrollment, CourseSection, Course } = db;
const enrollmentService = require('../services/enrollmentService');
const scheduleConflictService = require('../services/scheduleConflictService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Enroll in a course section
 * POST /api/v1/enrollments
 */
const enrollInCourse = async (req, res) => {
  try {
    const { section_id } = req.body;

    // Validate input
    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'Section ID gereklidir',
      });
    }

    logger.info(`Enrollment attempt - User: ${req.user.id}, Section: ${section_id}`);

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      logger.warn(`Student not found for user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    logger.info(`Student found: ${student.id} (${student.student_number})`);

    // Check if section exists
    const section = await CourseSection.findByPk(section_id);
    if (!section) {
      logger.warn(`Section not found: ${section_id}`);
      return res.status(404).json({
        success: false,
        message: 'Section bulunamadı',
      });
    }

    logger.info(`Section found: ${section.id} - Course: ${section.course_id}, Active: ${section.is_active}, Capacity: ${section.enrolled_count}/${section.capacity}`);

    // Enroll student
    const result = await enrollmentService.enrollStudent(student.id, section_id);

    logger.info(`✅ Student ${student.student_number} successfully enrolled in section ${section_id}`);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        enrollment: {
          id: result.enrollment.id,
          course: {
            code: result.enrollment.section.course.code,
            name: result.enrollment.section.course.name,
          },
          sectionNumber: result.enrollment.section.section_number,
          status: result.enrollment.status,
          enrollmentDate: result.enrollment.enrollment_date,
        },
      },
    });
  } catch (error) {
    logger.error('❌ Enrollment error:', {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      section_id: req.body?.section_id,
    });

    // Determine appropriate status code
    let statusCode = 400;
    let message = error.message;

    // Handle Sequelize Validation Errors
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      message = error.errors.map(e => e.message).join(', ');
      // If message is still generic "Validation error", provide more detail
      if (message === 'Validation error') {
        message = `Geçersiz veri: ${error.errors.map(e => `${e.path} (${e.value})`).join(', ')}`;
      }
    } else if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('already') || error.message.includes('full')) {
      statusCode = 409; // Conflict
    }

    res.status(statusCode).json({
      success: false,
      message: message || 'Ders kaydı yapılırken hata oluştu',
    });
  }
};

/**
 * Drop a course
 * DELETE /api/v1/enrollments/:id
 */
const dropCourse = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`🗑️ Drop course request - User: ${req.user.id}, Enrollment ID: ${id}`);

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      logger.warn(`❌ Student not found for user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    logger.info(`✅ Student found: ${student.id} (${student.student_number})`);

    const result = await enrollmentService.dropCourse(id, student.id);

    logger.info(`✅ Student ${student.student_number} successfully dropped enrollment ${id}`);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('❌ Drop course error:', {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      enrollmentId: req.params?.id,
    });

    // Determine appropriate status code
    let statusCode = 400;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('period')) {
      statusCode = 403; // Forbidden - drop period ended
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Ders bırakılırken hata oluştu',
    });
  }
};

/**
 * Get student's enrolled courses
 * GET /api/v1/enrollments/my-courses
 */
const getMyCourses = async (req, res) => {
  try {
    const { semester, year, status } = req.query;

    logger.info(`📚 Get my courses - User: ${req.user.id}, Filters: ${JSON.stringify({ semester, year, status })}`);

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      logger.warn(`❌ Student not found for user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    logger.info(`✅ Student found: ${student.id} (${student.student_number})`);

    const options = {};
    if (semester) options.semester = semester;
    if (year) options.year = parseInt(year);
    if (status) options.status = status;

    logger.info(`🔍 Fetching enrollments with options: ${JSON.stringify(options)}`);
    const enrollments = await enrollmentService.getStudentEnrollments(student.id, options);
    logger.info(`✅ Found ${enrollments.length} enrollments`);

    // Get attendance stats for each enrollment (optional, may fail if attendance service not available)
    let attendanceService;
    try {
      attendanceService = require('../services/attendanceService');
    } catch (err) {
      logger.warn('Attendance service not available, skipping attendance stats');
    }

    const enrollmentsWithAttendance = await Promise.all(
      enrollments.map(async (e) => {
        let attendanceStats = null;
        if (attendanceService) {
          try {
            attendanceStats = await attendanceService.getStudentAttendanceStats(student.id, e.section_id);
          } catch (err) {
            logger.warn(`Failed to get attendance stats for enrollment ${e.id}:`, err.message);
          }
        }

        return {
          id: e.id,
          course: {
            id: e.section?.course?.id,
            code: e.section?.course?.code,
            name: e.section?.course?.name,
            credits: e.section?.course?.credits,
          },
          section: {
            id: e.section?.id,
            sectionNumber: e.section?.section_number,
            semester: e.section?.semester,
            year: e.section?.year,
            instructor: e.section?.instructor?.user
              ? `${e.section.instructor.user.first_name} ${e.section.instructor.user.last_name}`
              : null,
            classroom: e.section?.classroom
              ? `${e.section.classroom.building} ${e.section.classroom.room_number}`
              : null,
            schedule: e.section?.schedule_json || e.section?.schedule,
          },
          status: e.status,
          enrollmentDate: e.enrollment_date,
          dropDate: e.drop_date,
          grades: {
            midterm: e.midterm_grade,
            final: e.final_grade,
            homework: e.homework_grade,
            average: e.average_grade,
            letterGrade: e.letter_grade,
            gradePoint: e.grade_point,
          },
          attendance: attendanceStats,
        };
      })
    );

    logger.info(`✅ Returning ${enrollmentsWithAttendance.length} enrollments with attendance data`);

    res.json({
      success: true,
      data: enrollmentsWithAttendance,
    });
  } catch (error) {
    logger.error('❌ Get my courses error:', {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      name: error.name,
      code: error.code,
    });
    
    // Provide more specific error messages
    let errorMessage = 'Dersler alınırken hata oluştu';
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError') {
      errorMessage = 'Veritabanı bağlantı hatası. Lütfen daha sonra tekrar deneyin.';
    } else if (error.name === 'SequelizeDatabaseError') {
      errorMessage = 'Veritabanı sorgu hatası: ' + error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get students in a section (for faculty)
 * GET /api/v1/enrollments/students/:sectionId
 */
const getSectionStudents = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Verify instructor teaches this section
    const faculty = await db.Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    if (faculty) {
      const section = await CourseSection.findByPk(sectionId);
      if (!section || (section.instructor_id !== faculty.id && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'Bu dersin öğrenci listesini görme yetkiniz yok',
        });
      }
    }

    const enrollments = await enrollmentService.getSectionStudents(sectionId);

    res.json({
      success: true,
      data: enrollments.map((e) => ({
        enrollmentId: e.id,
        student: {
          id: e.student.id,
          studentNumber: e.student.student_number,
          firstName: e.student.user.first_name,
          lastName: e.student.user.last_name,
          email: e.student.user.email,
          department: e.student.department?.name,
        },
        status: e.status,
        enrollmentDate: e.enrollment_date,
        grades: {
          midterm: e.midterm_grade,
          final: e.final_grade,
          homework: e.homework_grade,
          average: e.average_grade,
          letterGrade: e.letter_grade,
        },
      })),
    });
  } catch (error) {
    logger.error('Get section students error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenci listesi alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Check enrollment eligibility
 * GET /api/v1/enrollments/check/:sectionId
 */
const checkEligibility = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    const result = await enrollmentService.checkEnrollmentEligibility(student.id, sectionId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Check eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Kontrol yapılırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get student's weekly schedule
 * GET /api/v1/enrollments/schedule
 */
const getMySchedule = async (req, res) => {
  try {
    const { semester, year } = req.query;

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    // Default to current semester
    const currentDate = new Date();
    const currentYear = year || currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    let currentSemester = semester;
    if (!currentSemester) {
      if (currentMonth >= 1 && currentMonth <= 5) {
        currentSemester = 'spring';
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        currentSemester = 'summer';
      } else {
        currentSemester = 'fall';
      }
    }

    const schedule = await scheduleConflictService.getStudentSchedule(
      student.id,
      currentSemester,
      parseInt(currentYear)
    );

    res.json({
      success: true,
      data: {
        semester: currentSemester,
        year: parseInt(currentYear),
        schedule,
      },
    });
  } catch (error) {
    logger.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Ders programı alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get pending enrollments for faculty's sections
 * GET /api/v1/enrollments/pending
 */
const getPendingEnrollments = async (req, res) => {
  try {
    logger.info(`📋 Get pending enrollments - User: ${req.user.id}`);

    // Get faculty ID from user
    const faculty = await db.Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty) {
      logger.warn(`❌ Faculty not found for user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Öğretim üyesi kaydı bulunamadı',
      });
    }

    logger.info(`✅ Faculty found: ${faculty.id}`);

    const enrollments = await enrollmentService.getPendingEnrollmentsForFaculty(faculty.id);

    res.json({
      success: true,
      data: enrollments.map((e) => ({
        id: e.id,
        student: {
          id: e.student.id,
          studentNumber: e.student.student_number,
          firstName: e.student.user.first_name,
          lastName: e.student.user.last_name,
          email: e.student.user.email,
          department: e.student.department?.name,
        },
        course: {
          id: e.section.course.id,
          code: e.section.course.code,
          name: e.section.course.name,
          credits: e.section.course.credits,
        },
        section: {
          id: e.section.id,
          sectionNumber: e.section.section_number,
          semester: e.section.semester,
          year: e.section.year,
        },
        enrollmentDate: e.enrollment_date,
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    logger.error('❌ Get pending enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Bekleyen kayıtlar alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Approve a pending enrollment
 * PUT /api/v1/enrollments/:id/approve
 */
const approveEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`✅ Approve enrollment request - User: ${req.user.id}, Enrollment ID: ${id}`);

    // Get faculty ID from user
    const faculty = await db.Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty) {
      logger.warn(`❌ Faculty not found for user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Öğretim üyesi kaydı bulunamadı',
      });
    }

    const result = await enrollmentService.approveEnrollment(id, faculty.id);

    logger.info(`✅ Enrollment approved: ${id}`);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('❌ Approve enrollment error:', error);

    let statusCode = 400;
    if (error.message.includes('bulunamadı')) {
      statusCode = 404;
    } else if (error.message.includes('değilsiniz')) {
      statusCode = 403;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Kayıt onaylanırken hata oluştu',
    });
  }
};

/**
 * Reject a pending enrollment
 * PUT /api/v1/enrollments/:id/reject
 */
const rejectEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    logger.info(`❌ Reject enrollment request - User: ${req.user.id}, Enrollment ID: ${id}`);

    // Get faculty ID from user
    const faculty = await db.Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty) {
      logger.warn(`❌ Faculty not found for user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Öğretim üyesi kaydı bulunamadı',
      });
    }

    const result = await enrollmentService.rejectEnrollment(id, faculty.id, reason);

    logger.info(`✅ Enrollment rejected: ${id}`);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('❌ Reject enrollment error:', error);

    let statusCode = 400;
    if (error.message.includes('bulunamadı')) {
      statusCode = 404;
    } else if (error.message.includes('değilsiniz')) {
      statusCode = 403;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Kayıt reddedilirken hata oluştu',
    });
  }
};

/**
 * Bulk approve enrollments
 * PUT /api/v1/enrollments/approve-all
 */
const approveAllEnrollments = async (req, res) => {
  try {
    const { enrollmentIds } = req.body;

    logger.info(`✅ Bulk approve enrollments - User: ${req.user.id}, Count: ${enrollmentIds?.length}`);

    if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Onaylanacak kayıt ID\'leri gerekli',
      });
    }

    // Get faculty ID from user
    const faculty = await db.Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty) {
      return res.status(403).json({
        success: false,
        message: 'Öğretim üyesi kaydı bulunamadı',
      });
    }

    const results = {
      approved: [],
      failed: [],
    };

    for (const enrollmentId of enrollmentIds) {
      try {
        await enrollmentService.approveEnrollment(enrollmentId, faculty.id);
        results.approved.push(enrollmentId);
      } catch (error) {
        results.failed.push({ id: enrollmentId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `${results.approved.length} kayıt onaylandı, ${results.failed.length} başarısız`,
      data: results,
    });
  } catch (error) {
    logger.error('❌ Bulk approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu onay işlemi sırasında hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  enrollInCourse,
  dropCourse,
  getMyCourses,
  getSectionStudents,
  checkEligibility,
  getMySchedule,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment,
  approveAllEnrollments,
};


