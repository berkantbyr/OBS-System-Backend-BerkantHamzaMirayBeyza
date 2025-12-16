const db = require('../models');
const { Course, CourseSection, Department, Faculty, User, Classroom, CoursePrerequisite } = db;
const prerequisiteService = require('../services/prerequisiteService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get all courses with pagination and filtering
 * GET /api/v1/courses
 */
const getCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department_id,
      is_active = true,
      sort_by = 'code',
      sort_order = 'ASC',
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      where[Op.or] = [
        { code: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
      ];
    }

    if (department_id) {
      where.department_id = department_id;
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === true;
    }

    const { count, rows: courses } = await Course.findAndCountAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      ],
      order: [[sort_by, sort_order.toUpperCase()]],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Dersler alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get course by ID with prerequisites and sections
 * GET /api/v1/courses/:id
 */
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      ],
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Ders bulunamadı',
      });
    }

    // Get prerequisites
    const prerequisites = await prerequisiteService.getDirectPrerequisites(id);
    
    // If user is authenticated and is a student, check prerequisite completion status
    let prerequisitesWithStatus = prerequisites;
    if (req.user && req.user.role === 'student') {
      try {
        const { Student } = require('../models');
        const student = await Student.findOne({ where: { user_id: req.user.id } });
        
        if (student) {
          prerequisitesWithStatus = await Promise.all(
            prerequisites.map(async (prereq) => {
              try {
                const completed = await prerequisiteService.hasCompletedCourse(
                  student.id,
                  prereq.id,
                  prereq.min_grade || 'DD'
                );
                return {
                  ...prereq,
                  completed,
                };
              } catch (error) {
                logger.warn(`Error checking prerequisite ${prereq.id} for student ${student.id}:`, error);
                // Return prerequisite without status if check fails
                return {
                  ...prereq,
                  completed: undefined,
                };
              }
            })
          );
        }
      } catch (error) {
        logger.warn('Error checking prerequisite status:', error);
        // Continue without status if check fails
      }
    }
 
    const sections = await CourseSection.findAll({
      where: {
        course_id: id,
        is_active: true,
      },
      include: [
        {
          model: Faculty,
          as: 'instructor',
          include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
        },
        { model: Classroom, as: 'classroom', attributes: ['building', 'room_number'] },
      ],
      order: [['year', 'DESC'], ['semester', 'ASC'], ['section_number', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        course,
        prerequisites: prerequisitesWithStatus,
        sections: sections.map((s) => ({
          id: s.id,
          sectionNumber: s.section_number,
          semester: s.semester,
          year: s.year,
          instructor: s.instructor
            ? `${s.instructor.user.first_name} ${s.instructor.user.last_name}`
            : null,
          instructorId: s.instructor_id,
          classroom: s.classroom ? `${s.classroom.building} ${s.classroom.room_number}` : null,
          capacity: s.capacity,
          enrolledCount: s.enrolled_count,
          availableSeats: s.capacity - s.enrolled_count,
          schedule: s.schedule_json,
        })),
      },
    });
  } catch (error) {
    logger.error('Get course by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Ders detayları alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Create a new course (admin only)
 * POST /api/v1/courses
 */
const createCourse = async (req, res) => {
  try {
    const { code, name, description, credits, ects, syllabus_url, department_id, prerequisites } = req.body;

    // Check if course code already exists
    const existingCourse = await Course.findOne({ where: { code } });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Bu ders kodu zaten mevcut',
      });
    }

    // Validate department
    if (department_id) {
      const department = await Department.findByPk(department_id);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz bölüm',
        });
      }
    }

    // Create course
    const course = await Course.create({
      code,
      name,
      description,
      credits: credits || 3,
      ects: ects || 5,
      syllabus_url,
      department_id,
      is_active: true,
    });

    // Add prerequisites if provided
    if (prerequisites && Array.isArray(prerequisites)) {
      for (const prereq of prerequisites) {
        const prereqCourse = await Course.findByPk(prereq.course_id);
        if (prereqCourse) {
          await CoursePrerequisite.create({
            course_id: course.id,
            prerequisite_course_id: prereq.course_id,
            min_grade: prereq.min_grade || 'DD',
          });
        }
      }
    }

    logger.info(`Course created: ${code} by admin ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Ders başarıyla oluşturuldu',
      data: course,
    });
  } catch (error) {
    logger.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Ders oluşturulurken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Update a course (admin only)
 * PUT /api/v1/courses/:id
 */
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, credits, ects, syllabus_url, department_id, is_active, prerequisites } = req.body;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Ders bulunamadı',
      });
    }

    // Check if new code conflicts with another course
    if (code && code !== course.code) {
      const existingCourse = await Course.findOne({ where: { code, id: { [Op.ne]: id } } });
      if (existingCourse) {
        return res.status(400).json({
          success: false,
          message: 'Bu ders kodu başka bir ders tarafından kullanılıyor',
        });
      }
    }

    // Update course
    await course.update({
      code: code || course.code,
      name: name || course.name,
      description: description !== undefined ? description : course.description,
      credits: credits || course.credits,
      ects: ects || course.ects,
      syllabus_url: syllabus_url !== undefined ? syllabus_url : course.syllabus_url,
      department_id: department_id !== undefined ? department_id : course.department_id,
      is_active: is_active !== undefined ? is_active : course.is_active,
    });

    // Update prerequisites if provided
    if (prerequisites && Array.isArray(prerequisites)) {
      // Remove existing prerequisites
      await CoursePrerequisite.destroy({ where: { course_id: id } });

      // Add new prerequisites
      for (const prereq of prerequisites) {
        const prereqCourse = await Course.findByPk(prereq.course_id);
        if (prereqCourse) {
          await CoursePrerequisite.create({
            course_id: id,
            prerequisite_course_id: prereq.course_id,
            min_grade: prereq.min_grade || 'DD',
          });
        }
      }
    }

    logger.info(`Course updated: ${course.code} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Ders başarıyla güncellendi',
      data: course,
    });
  } catch (error) {
    logger.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Ders güncellenirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Delete a course (soft delete, admin only)
 * DELETE /api/v1/courses/:id
 */
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Ders bulunamadı',
      });
    }

    // Soft delete (paranoid mode)
    await course.destroy();

    logger.info(`Course deleted: ${course.code} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Ders başarıyla silindi',
    });
  } catch (error) {
    logger.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Ders silinirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get all departments (for filtering)
 * GET /api/v1/courses/departments
 */
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: { is_active: true },
      attributes: ['id', 'code', 'name'],
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    logger.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölümler alınırken hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getDepartments,
};



