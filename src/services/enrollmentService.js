const db = require('../models');
const { Enrollment, CourseSection, Course, Student } = db;
const prerequisiteService = require('./prerequisiteService');
const scheduleConflictService = require('./scheduleConflictService');
const logger = require('../utils/logger');
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
      logger.info(`🔄 Starting enrollment - Student: ${studentId}, Section: ${sectionId}`);

      // Get section with course info
      const section = await CourseSection.findByPk(sectionId, {
        include: [{ model: Course, as: 'course' }],
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!section) {
        logger.warn(`❌ Section not found: ${sectionId}`);
        throw new Error('Section bulunamadı');
      }

      logger.info(`📚 Section found: ${section.course?.code || 'N/A'} - Active: ${section.is_active}, Capacity: ${section.enrolled_count}/${section.capacity}`);

      if (!section.is_active) {
        logger.warn(`❌ Section is not active: ${sectionId}`);
        throw new Error('Section aktif değil');
      }

      // Check capacity with atomic update
      if (section.enrolled_count >= section.capacity) {
        logger.warn(`❌ Section is full: ${sectionId} (${section.enrolled_count}/${section.capacity})`);
        throw new Error('Section dolu');
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
        logger.warn(`❌ Existing enrollment found: ${existingEnrollment.id}, Status: ${existingEnrollment.status}`);
        if (existingEnrollment.status === 'enrolled') {
          throw new Error('Bu section\'a zaten kayıtlısınız');
        }
        if (existingEnrollment.status === 'dropped') {
          throw new Error('Bırakılan bir derse tekrar kayıt olamazsınız');
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
        throw new Error('Bu dersin başka bir section\'ına zaten kayıtlısınız');
      }

      // Check prerequisites
      logger.info(`🔍 Checking prerequisites for course: ${section.course_id}`);
      const prereqResult = await prerequisiteService.checkPrerequisites(studentId, section.course_id);
      if (!prereqResult.satisfied) {
        const missingCourses = prereqResult.missing.map((m) => `${m.courseCode} (${m.courseName})`).join(', ');
        logger.warn(`❌ Prerequisites not met. Missing: ${missingCourses}`);
        throw new Error(`Önkoşullar karşılanmadı. Eksik dersler: ${missingCourses}`);
      }
      logger.info(`✅ Prerequisites satisfied`);

      // Check schedule conflicts
      logger.info(`🔍 Checking schedule conflicts`);
      const conflictResult = await scheduleConflictService.checkScheduleConflict(studentId, sectionId);
      
      // Allow schedule conflicts if ALLOW_SCHEDULE_CONFLICTS is enabled
      const allowConflicts = process.env.ALLOW_SCHEDULE_CONFLICTS === 'true';
      
      if (conflictResult.hasConflict && !allowConflicts) {
        const conflictInfo = conflictResult.conflicts[0];
        const dayNames = {
          monday: 'Pazartesi',
          tuesday: 'Salı',
          wednesday: 'Çarşamba',
          thursday: 'Perşembe',
          friday: 'Cuma',
          saturday: 'Cumartesi',
          sunday: 'Pazar',
        };
        const conflictDay = dayNames[conflictInfo.conflictDay?.toLowerCase()] || conflictInfo.conflictDay;
        logger.warn(`❌ Schedule conflict detected: ${conflictInfo.existingCourse.code} on ${conflictDay}`);
        throw new Error(
          `${conflictInfo.existingCourse.code} dersi ile ${conflictDay} günü program çakışması var`
        );
      }
      
      if (conflictResult.hasConflict && allowConflicts) {
        logger.warn(`⚠️ Schedule conflict detected but allowed (ALLOW_SCHEDULE_CONFLICTS=true)`);
        const conflictInfo = conflictResult.conflicts[0];
        const dayNames = {
          monday: 'Pazartesi',
          tuesday: 'Salı',
          wednesday: 'Çarşamba',
          thursday: 'Perşembe',
          friday: 'Cuma',
          saturday: 'Cumartesi',
          sunday: 'Pazar',
        };
        const conflictDay = dayNames[conflictInfo.conflictDay?.toLowerCase()] || conflictInfo.conflictDay;
        logger.warn(`⚠️ Conflict: ${conflictInfo.existingCourse.code} on ${conflictDay} - Enrollment will proceed`);
      } else {
        logger.info(`✅ No schedule conflicts`);
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
        throw new Error('Section dolu (eşzamanlı kayıt)');
      }

      // Create enrollment
      logger.info(`📝 Creating enrollment record`);
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

      logger.info(`✅ Enrollment created: ${enrollment.id}`);

      await transaction.commit();
      logger.info(`✅ Transaction committed successfully`);

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

      logger.info(`✅ Enrollment completed successfully - ${section.course.code} - ${section.course.name}`);

      return {
        success: true,
        enrollment: result,
        message: `Successfully enrolled in ${section.course.code} - ${section.course.name}`,
      };
    } catch (error) {
      logger.error(`❌ Enrollment failed - Rolling back transaction:`, error);
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
      logger.info(`🗑️ Starting drop course - Enrollment: ${enrollmentId}, Student: ${studentId}`);

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
        logger.warn(`❌ Enrollment not found or already dropped - ID: ${enrollmentId}, Student: ${studentId}`);
        throw new Error('Kayıt bulunamadı veya zaten bırakılmış');
      }

      logger.info(`✅ Enrollment found: ${enrollment.id} - Course: ${enrollment.section?.course?.code || 'N/A'}`);

      // Check drop period
      const enrollmentDate = new Date(enrollment.enrollment_date);
      const daysSinceEnrollment = Math.floor((Date.now() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24));

      logger.info(`📅 Days since enrollment: ${daysSinceEnrollment} (Drop period: ${this.DROP_PERIOD_DAYS} days)`);

      if (daysSinceEnrollment > this.DROP_PERIOD_DAYS) {
        logger.warn(`❌ Drop period ended - Days: ${daysSinceEnrollment}, Limit: ${this.DROP_PERIOD_DAYS}`);
        throw new Error(
          `Ders bırakma süresi doldu. Dersler sadece ilk ${this.DROP_PERIOD_DAYS} gün içinde bırakılabilir.`
        );
      }

      // Update enrollment status
      logger.info(`📝 Updating enrollment status to 'dropped'`);
      enrollment.status = 'dropped';
      enrollment.drop_date = new Date();
      await enrollment.save({ transaction });

      // Update section capacity (decrease enrolled_count)
      logger.info(`📉 Decreasing section capacity for section: ${enrollment.section_id}`);
      const [updateCount] = await CourseSection.update(
        { enrolled_count: db.sequelize.literal('enrolled_count - 1') },
        {
          where: { id: enrollment.section_id },
          transaction,
        }
      );

      if (updateCount === 0) {
        logger.warn(`⚠️ Section capacity update failed - Section: ${enrollment.section_id}`);
        // Don't throw error, enrollment is already dropped
      } else {
        logger.info(`✅ Section capacity updated - Section: ${enrollment.section_id}`);
      }

      await transaction.commit();
      logger.info(`✅ Transaction committed - Course dropped successfully`);

      return {
        success: true,
        message: `${enrollment.section.course.code} - ${enrollment.section.course.name} dersi başarıyla bırakıldı`,
      };
    } catch (error) {
      logger.error(`❌ Drop course failed - Rolling back transaction:`, error);
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
      return { eligible: false, reason: 'Section bulunamadı' };
    }

    const checks = {
      isActive: section.is_active,
      hasCapacity: section.enrolled_count < section.capacity,
      prerequisites: await prerequisiteService.checkPrerequisites(studentId, section.course_id),
      scheduleConflict: await scheduleConflictService.checkScheduleConflict(studentId, sectionId),
    };

    // Allow schedule conflicts if ALLOW_SCHEDULE_CONFLICTS is enabled
    const allowConflicts = process.env.ALLOW_SCHEDULE_CONFLICTS === 'true';

    const issues = [];

    if (!checks.isActive) issues.push('Section aktif değil');
    if (!checks.hasCapacity) issues.push('Section dolu');
    if (!checks.prerequisites.satisfied) {
      issues.push(`Eksik önkoşullar: ${checks.prerequisites.missing.map((m) => m.courseCode).join(', ')}`);
    }
    // Only add schedule conflict as an issue if conflicts are not allowed
    if (checks.scheduleConflict.hasConflict && !allowConflicts) {
      issues.push('Program çakışması tespit edildi');
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

