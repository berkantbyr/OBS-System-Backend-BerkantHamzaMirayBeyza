const db = require('../models');
const { Enrollment, CourseSection, Course, Student } = db;
const prerequisiteService = require('./prerequisiteService');
const scheduleConflictService = require('./scheduleConflictService');
const { Op } = require('sequelize');

/**
 * EnrollmentService - Orchestrates enrollment checks and operations
 */
class EnrollmentService {
  /**
   * Drop period in days (first 4 weeks)
   */
  DROP_PERIOD_DAYS = 28;

  /**
   * Enroll a student in a course section
   * @param {string} studentId - Student ID
   * @param {string} sectionId - Section ID
   * @returns {Object} - Enrollment result
   */
  async enrollStudent(studentId, sectionId) {
    const transaction = await db.sequelize.transaction();

    try {
      // Get section with course info
      const section = await CourseSection.findByPk(sectionId, {
        include: [{ model: Course, as: 'course' }],
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!section) {
        throw new Error('Section not found');
      }

      if (!section.is_active) {
        throw new Error('Section is not active');
      }

      // Check capacity with atomic update
      if (section.enrolled_count >= section.capacity) {
        throw new Error('Section is full');
      }

      // Check if already enrolled in this section
      const existingEnrollment = await Enrollment.findOne({
        where: {
          student_id: studentId,
          section_id: sectionId,
        },
        transaction,
      });

      if (existingEnrollment) {
        if (existingEnrollment.status === 'enrolled') {
          throw new Error('Already enrolled in this section');
        }
        if (existingEnrollment.status === 'dropped') {
          throw new Error('Cannot re-enroll in a dropped course');
        }
      }

      // Check if enrolled in another section of the same course this semester
      const otherSectionEnrollment = await Enrollment.findOne({
        where: {
          student_id: studentId,
          status: 'enrolled',
        },
        include: [
          {
            model: CourseSection,
            as: 'section',
            where: {
              course_id: section.course_id,
              semester: section.semester,
              year: section.year,
              id: { [Op.ne]: sectionId },
            },
          },
        ],
        transaction,
      });

      if (otherSectionEnrollment) {
        throw new Error('Already enrolled in another section of this course');
      }

      // Check prerequisites
      const prereqResult = await prerequisiteService.checkPrerequisites(studentId, section.course_id);
      if (!prereqResult.satisfied) {
        const missingCourses = prereqResult.missing.map((m) => `${m.courseCode} (${m.courseName})`).join(', ');
        throw new Error(`Prerequisites not met. Missing: ${missingCourses}`);
      }

      // Check schedule conflicts
      const conflictResult = await scheduleConflictService.checkScheduleConflict(studentId, sectionId);
      if (conflictResult.hasConflict) {
        const conflictInfo = conflictResult.conflicts[0];
        throw new Error(
          `Schedule conflict with ${conflictInfo.existingCourse.code} on ${conflictInfo.conflictDay}`
        );
      }

      // Check if this is a repeat
      const previousEnrollment = await this.getPreviousCourseEnrollment(studentId, section.course_id);
      const isRepeat = previousEnrollment !== null && previousEnrollment.status !== 'completed';

      // Atomic capacity update
      const [updateCount] = await CourseSection.update(
        { enrolled_count: db.sequelize.literal('enrolled_count + 1') },
        {
          where: {
            id: sectionId,
            enrolled_count: { [Op.lt]: section.capacity },
          },
          transaction,
        }
      );

      if (updateCount === 0) {
        throw new Error('Section is full (concurrent enrollment)');
      }

      // Create enrollment
      const enrollment = await Enrollment.create(
        {
          student_id: studentId,
          section_id: sectionId,
          status: 'enrolled',
          enrollment_date: new Date(),
          is_repeat: isRepeat,
        },
        { transaction }
      );

      await transaction.commit();

      // Return with section and course info
      const result = await Enrollment.findByPk(enrollment.id, {
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [{ model: Course, as: 'course' }],
          },
        ],
      });

      return {
        success: true,
        enrollment: result,
        message: `Successfully enrolled in ${section.course.code} - ${section.course.name}`,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Drop a course enrollment
   * @param {string} enrollmentId - Enrollment ID
   * @param {string} studentId - Student ID (for verification)
   * @returns {Object} - Drop result
   */
  async dropCourse(enrollmentId, studentId) {
    const transaction = await db.sequelize.transaction();

    try {
      const enrollment = await Enrollment.findOne({
        where: {
          id: enrollmentId,
          student_id: studentId,
          status: 'enrolled',
        },
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [{ model: Course, as: 'course' }],
          },
        ],
        transaction,
      });

      if (!enrollment) {
        throw new Error('Enrollment not found or already dropped');
      }

      // Check drop period
      const enrollmentDate = new Date(enrollment.enrollment_date);
      const daysSinceEnrollment = Math.floor((Date.now() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceEnrollment > this.DROP_PERIOD_DAYS) {
        throw new Error(
          `Drop period has ended. Courses can only be dropped within the first ${this.DROP_PERIOD_DAYS} days.`
        );
      }

      // Update enrollment status
      enrollment.status = 'dropped';
      enrollment.drop_date = new Date();
      await enrollment.save({ transaction });

      // Update section capacity
      await CourseSection.update(
        { enrolled_count: db.sequelize.literal('enrolled_count - 1') },
        {
          where: { id: enrollment.section_id },
          transaction,
        }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Successfully dropped ${enrollment.section.course.code} - ${enrollment.section.course.name}`,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get previous enrollment in a course
   * @param {string} studentId - Student ID
   * @param {string} courseId - Course ID
   * @returns {Object|null} - Previous enrollment or null
   */
  async getPreviousCourseEnrollment(studentId, courseId) {
    return await Enrollment.findOne({
      where: {
        student_id: studentId,
        status: { [Op.in]: ['completed', 'failed'] },
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: { course_id: courseId },
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Get student's current enrollments
   * @param {string} studentId - Student ID
   * @param {Object} options - { semester, year }
   * @returns {Array} - Array of enrollments
   */
  async getStudentEnrollments(studentId, options = {}) {
    const whereClause = {
      student_id: studentId,
    };

    if (options.status) {
      whereClause.status = options.status;
    }

    const sectionWhere = {};
    if (options.semester) sectionWhere.semester = options.semester;
    if (options.year) sectionWhere.year = options.year;

    return await Enrollment.findAll({
      where: whereClause,
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
          include: [
            { model: Course, as: 'course' },
            {
              model: db.Faculty,
              as: 'instructor',
              include: [{ model: db.User, as: 'user', attributes: ['first_name', 'last_name'] }],
            },
            { model: db.Classroom, as: 'classroom' },
          ],
        },
      ],
      order: [[{ model: CourseSection, as: 'section' }, 'year', 'DESC']],
    });
  }

  /**
   * Get section's enrolled students
   * @param {string} sectionId - Section ID
   * @returns {Array} - Array of students with enrollment info
   */
  async getSectionStudents(sectionId) {
    return await Enrollment.findAll({
      where: {
        section_id: sectionId,
        status: 'enrolled',
      },
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            { model: db.User, as: 'user', attributes: ['first_name', 'last_name', 'email'] },
            { model: db.Department, as: 'department', attributes: ['name', 'code'] },
          ],
        },
      ],
      order: [[{ model: Student, as: 'student' }, 'student_number', 'ASC']],
    });
  }

  /**
   * Check enrollment eligibility without enrolling
   * @param {string} studentId - Student ID
   * @param {string} sectionId - Section ID
   * @returns {Object} - Eligibility check result
   */
  async checkEnrollmentEligibility(studentId, sectionId) {
    const section = await CourseSection.findByPk(sectionId, {
      include: [{ model: Course, as: 'course' }],
    });

    if (!section) {
      return { eligible: false, reason: 'Section not found' };
    }

    const checks = {
      isActive: section.is_active,
      hasCapacity: section.enrolled_count < section.capacity,
      prerequisites: await prerequisiteService.checkPrerequisites(studentId, section.course_id),
      scheduleConflict: await scheduleConflictService.checkScheduleConflict(studentId, sectionId),
    };

    const issues = [];

    if (!checks.isActive) issues.push('Section is not active');
    if (!checks.hasCapacity) issues.push('Section is full');
    if (!checks.prerequisites.satisfied) {
      issues.push(`Missing prerequisites: ${checks.prerequisites.missing.map((m) => m.courseCode).join(', ')}`);
    }
    if (checks.scheduleConflict.hasConflict) {
      issues.push('Schedule conflict detected');
    }

    return {
      eligible: issues.length === 0,
      issues,
      details: {
        section: {
          code: section.course.code,
          name: section.course.name,
          sectionNumber: section.section_number,
          capacity: section.capacity,
          enrolled: section.enrolled_count,
          available: section.capacity - section.enrolled_count,
        },
        ...checks,
      },
    };
  }
}

module.exports = new EnrollmentService();

