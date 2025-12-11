const db = require('../models');
const { CourseSection, Course, Faculty, User, Classroom, Department } = db;
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get all sections with filtering
 * GET /api/v1/sections
 */
const getSections = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      course_id,
      instructor_id,
      semester,
      year,
      is_active = true,
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (course_id) where.course_id = course_id;
    if (instructor_id) where.instructor_id = instructor_id;
    if (semester) where.semester = semester;
    if (year) where.year = parseInt(year);
    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === true;
    }

    const { count, rows: sections } = await CourseSection.findAndCountAll({
      where,
      include: [
        { model: Course, as: 'course', attributes: ['id', 'code', 'name', 'credits', 'ects'] },
        {
          model: Faculty,
          as: 'instructor',
          include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
        },
        { model: Classroom, as: 'classroom', attributes: ['building', 'room_number', 'capacity'] },
      ],
      order: [['year', 'DESC'], ['semester', 'ASC'], ['section_number', 'ASC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        sections: sections.map((s) => ({
          id: s.id,
          course: s.course,
          sectionNumber: s.section_number,
          semester: s.semester,
          year: s.year,
          instructor: s.instructor
            ? {
                id: s.instructor.id,
                name: `${s.instructor.user.first_name} ${s.instructor.user.last_name}`,
              }
            : null,
          classroom: s.classroom
            ? {
                id: s.classroom_id,
                location: `${s.classroom.building} ${s.classroom.room_number}`,
                capacity: s.classroom.capacity,
              }
            : null,
          capacity: s.capacity,
          enrolledCount: s.enrolled_count,
          availableSeats: s.capacity - s.enrolled_count,
          schedule: s.schedule_json,
          isActive: s.is_active,
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
    logger.error('Get sections error:', error);
    res.status(500).json({
      success: false,
      message: 'Sectionlar alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get section by ID
 * GET /api/v1/sections/:id
 */
const getSectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await CourseSection.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }],
        },
        {
          model: Faculty,
          as: 'instructor',
          include: [
            { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] },
            { model: Department, as: 'department', attributes: ['name'] },
          ],
        },
        {
          model: Classroom,
          as: 'classroom',
          attributes: ['id', 'building', 'room_number', 'capacity', 'latitude', 'longitude', 'features_json'],
        },
      ],
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section bulunamadı',
      });
    }

    res.json({
      success: true,
      data: {
        id: section.id,
        course: section.course,
        sectionNumber: section.section_number,
        semester: section.semester,
        year: section.year,
        instructor: section.instructor
          ? {
              id: section.instructor.id,
              name: `${section.instructor.user.first_name} ${section.instructor.user.last_name}`,
              email: section.instructor.user.email,
              department: section.instructor.department?.name,
            }
          : null,
        classroom: section.classroom,
        capacity: section.capacity,
        enrolledCount: section.enrolled_count,
        availableSeats: section.capacity - section.enrolled_count,
        schedule: section.schedule_json,
        isActive: section.is_active,
      },
    });
  } catch (error) {
    logger.error('Get section by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Section detayları alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Create a new section (admin only)
 * POST /api/v1/sections
 */
const createSection = async (req, res) => {
  try {
    const {
      course_id,
      section_number,
      semester,
      year,
      instructor_id,
      classroom_id,
      capacity,
      schedule_json,
    } = req.body;

    // Validate course
    const course = await Course.findByPk(course_id);
    if (!course) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz ders',
      });
    }

    // Validate instructor if provided
    if (instructor_id) {
      const instructor = await Faculty.findByPk(instructor_id);
      if (!instructor) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz öğretim üyesi',
        });
      }
    }

    // Check for duplicate section
    const existingSection = await CourseSection.findOne({
      where: { course_id, section_number, semester, year },
    });
    if (existingSection) {
      return res.status(400).json({
        success: false,
        message: 'Bu dönem için aynı section numarası zaten mevcut',
      });
    }

    // Create section
    const section = await CourseSection.create({
      course_id,
      section_number: section_number || 1,
      semester,
      year,
      instructor_id,
      classroom_id,
      capacity: capacity || 30,
      enrolled_count: 0,
      schedule_json,
      is_active: true,
    });

    logger.info(`Section created for course ${course.code} by admin ${req.user.id}`);

    // Fetch with associations
    const result = await CourseSection.findByPk(section.id, {
      include: [
        { model: Course, as: 'course', attributes: ['code', 'name'] },
        {
          model: Faculty,
          as: 'instructor',
          include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
        },
        { model: Classroom, as: 'classroom', attributes: ['building', 'room_number'] },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Section başarıyla oluşturuldu',
      data: result,
    });
  } catch (error) {
    logger.error('Create section error:', error);
    res.status(500).json({
      success: false,
      message: 'Section oluşturulurken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Update a section (admin only)
 * PUT /api/v1/sections/:id
 */
const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      section_number,
      instructor_id,
      classroom_id,
      capacity,
      schedule_json,
      is_active,
    } = req.body;

    const section = await CourseSection.findByPk(id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section bulunamadı',
      });
    }

    // Validate new capacity
    if (capacity !== undefined && capacity < section.enrolled_count) {
      return res.status(400).json({
        success: false,
        message: `Kapasite mevcut kayıtlı öğrenci sayısından (${section.enrolled_count}) az olamaz`,
      });
    }

    // Update section
    await section.update({
      section_number: section_number !== undefined ? section_number : section.section_number,
      instructor_id: instructor_id !== undefined ? instructor_id : section.instructor_id,
      classroom_id: classroom_id !== undefined ? classroom_id : section.classroom_id,
      capacity: capacity !== undefined ? capacity : section.capacity,
      schedule_json: schedule_json !== undefined ? schedule_json : section.schedule_json,
      is_active: is_active !== undefined ? is_active : section.is_active,
    });

    logger.info(`Section updated: ${id} by admin ${req.user.id}`);

    // Fetch updated with associations
    const result = await CourseSection.findByPk(id, {
      include: [
        { model: Course, as: 'course', attributes: ['code', 'name'] },
        {
          model: Faculty,
          as: 'instructor',
          include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
        },
        { model: Classroom, as: 'classroom', attributes: ['building', 'room_number'] },
      ],
    });

    res.json({
      success: true,
      message: 'Section başarıyla güncellendi',
      data: result,
    });
  } catch (error) {
    logger.error('Update section error:', error);
    res.status(500).json({
      success: false,
      message: 'Section güncellenirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get instructor's sections
 * GET /api/v1/sections/my-sections
 */
const getInstructorSections = async (req, res) => {
  try {
    const { semester, year } = req.query;

    // Get faculty ID from user
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty) {
      return res.status(403).json({
        success: false,
        message: 'Öğretim üyesi kaydı bulunamadı',
      });
    }

    const where = { instructor_id: faculty.id };
    if (semester) where.semester = semester;
    if (year) where.year = parseInt(year);

    const sections = await CourseSection.findAll({
      where,
      include: [
        { model: Course, as: 'course', attributes: ['id', 'code', 'name', 'credits'] },
        { model: Classroom, as: 'classroom', attributes: ['building', 'room_number'] },
      ],
      order: [['year', 'DESC'], ['semester', 'ASC']],
    });

    res.json({
      success: true,
      data: sections.map((s) => ({
        id: s.id,
        course: s.course,
        sectionNumber: s.section_number,
        semester: s.semester,
        year: s.year,
        classroom: s.classroom ? `${s.classroom.building} ${s.classroom.room_number}` : null,
        capacity: s.capacity,
        enrolledCount: s.enrolled_count,
        schedule: s.schedule_json,
      })),
    });
  } catch (error) {
    logger.error('Get instructor sections error:', error);
    res.status(500).json({
      success: false,
      message: 'Dersler alınırken hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  getSections,
  getSectionById,
  createSection,
  updateSection,
  getInstructorSections,
};

