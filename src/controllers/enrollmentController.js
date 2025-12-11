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

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    const result = await enrollmentService.enrollStudent(student.id, section_id);

    logger.info(`Student ${student.student_number} enrolled in section ${section_id}`);

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
    logger.error('Enrollment error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
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

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    const result = await enrollmentService.dropCourse(id, student.id);

    logger.info(`Student ${student.student_number} dropped enrollment ${id}`);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Drop course error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
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

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    const options = {};
    if (semester) options.semester = semester;
    if (year) options.year = parseInt(year);
    if (status) options.status = status;

    const enrollments = await enrollmentService.getStudentEnrollments(student.id, options);

    // Get attendance stats for each enrollment
    const attendanceService = require('../services/attendanceService');
    const enrollmentsWithAttendance = await Promise.all(
      enrollments.map(async (e) => {
        const attendanceStats = await attendanceService.getStudentAttendanceStats(student.id, e.section_id);
        return {
          id: e.id,
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
            instructor: e.section.instructor
              ? `${e.section.instructor.user.first_name} ${e.section.instructor.user.last_name}`
              : null,
            classroom: e.section.classroom
              ? `${e.section.classroom.building} ${e.section.classroom.room_number}`
              : null,
            schedule: e.section.schedule_json,
          },
          status: e.status,
          enrollmentDate: e.enrollment_date,
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

    res.json({
      success: true,
      data: enrollmentsWithAttendance,
    });
  } catch (error) {
    logger.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Dersler alınırken hata oluştu',
      error: error.message,
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

module.exports = {
  enrollInCourse,
  dropCourse,
  getMyCourses,
  getSectionStudents,
  checkEligibility,
  getMySchedule,
};

