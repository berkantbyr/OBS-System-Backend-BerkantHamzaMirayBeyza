const userService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id);

    // Convert profile picture URL to full URL if exists
    if (user.profile_picture_url && !user.profile_picture_url.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      user.profile_picture_url = `${protocol}://${host}${user.profile_picture_url}`;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get profile error:', error);

    res.status(404).json({
      success: false,
      message: error.message,
      code: 'NOT_FOUND',
    });
  }
};

/**
 * Update current user profile
 * PUT /api/v1/users/me
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Profil güncellendi',
      data: user,
    });
  } catch (error) {
    logger.error('Update profile error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
      code: 'UPDATE_ERROR',
    });
  }
};

/**
 * Update profile picture
 * POST /api/v1/users/me/profile-picture
 */
const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir resim dosyası yükleyin',
        code: 'NO_FILE',
      });
    }

    const pictureUrl = `/uploads/${req.file.filename}`;
    const user = await userService.updateProfilePicture(req.user.id, pictureUrl);

    // Get full URL for the profile picture
    const protocol = req.protocol;
    const host = req.get('host');
    const fullPictureUrl = `${protocol}://${host}${pictureUrl}`;

    res.status(200).json({
      success: true,
      message: 'Profil fotoğrafı güncellendi',
      data: {
        profilePictureUrl: fullPictureUrl,
        user,
      },
    });
  } catch (error) {
    logger.error('Update profile picture error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
      code: 'UPDATE_ERROR',
    });
  }
};

/**
 * Change password
 * PUT /api/v1/users/me/password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.changePassword(req.user.id, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Change password error:', error);

    const status = error.message.includes('yanlış') ? 401 : 400;

    res.status(status).json({
      success: false,
      message: error.message,
      code: 'PASSWORD_ERROR',
    });
  }
};

/**
 * Get all users (admin only)
 * GET /api/v1/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const result = await userService.getAllUsers(req.query);

    // Convert profile picture URLs to full URLs
    const protocol = req.protocol;
    const host = req.get('host');
    const users = result.users.map(user => {
      if (user.profile_picture_url && !user.profile_picture_url.startsWith('http')) {
        user.profile_picture_url = `${protocol}://${host}${user.profile_picture_url}`;
      }
      return user;
    });

    res.status(200).json({
      success: true,
      data: users,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get all users error:', error);

    res.status(500).json({
      success: false,
      message: error.message,
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Get user by ID (admin only)
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

    // Convert profile picture URL to full URL if exists
    if (user.profile_picture_url && !user.profile_picture_url.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      user.profile_picture_url = `${protocol}://${host}${user.profile_picture_url}`;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);

    res.status(404).json({
      success: false,
      message: error.message,
      code: 'NOT_FOUND',
    });
  }
};

/**
 * Update user status (admin only)
 * PATCH /api/v1/users/:id/status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await userService.updateUserStatus(req.params.id, isActive);

    res.status(200).json({
      success: true,
      message: `Kullanıcı ${isActive ? 'aktifleştirildi' : 'devre dışı bırakıldı'}`,
      data: user,
    });
  } catch (error) {
    logger.error('Update user status error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
      code: 'UPDATE_ERROR',
    });
  }
};

/**
 * Delete user (admin only)
 * DELETE /api/v1/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz',
        code: 'SELF_DELETE',
      });
    }

    const result = await userService.deleteUser(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Delete user error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
      code: 'DELETE_ERROR',
    });
  }
};

/**
 * Get all faculty members (for admin dropdowns)
 * GET /api/v1/users/faculty
 */
const getAllFaculty = async (req, res) => {
  try {
    const db = require('../models');
    const { Faculty, User, Department } = db;

    const faculty = await Faculty.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          where: { is_active: true }
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
      ],
      order: [[{ model: User, as: 'user' }, 'last_name', 'ASC']],
    });

    res.json({
      success: true,
      data: faculty.map(f => ({
        id: f.id,
        userId: f.user_id,
        name: `${f.user.first_name} ${f.user.last_name}`,
        email: f.user.email,
        department: f.department?.name || null,
        departmentCode: f.department?.code || null,
        title: f.title,
      })),
    });
  } catch (error) {
    logger.error('Get all faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğretim üyeleri alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get all departments (for dropdowns)
 * GET /api/v1/users/departments
 */
const getAllDepartments = async (req, res) => {
  try {
    const db = require('../models');
    const { Department } = db;

    const departments = await Department.findAll({
      attributes: ['id', 'name', 'code', 'faculty', 'is_active'],
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    logger.error('Get all departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölümler alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Create a new department (admin only)
 * POST /api/v1/users/departments
 */
const createDepartment = async (req, res) => {
  try {
    const db = require('../models');
    const { Department } = db;
    const { code, name, faculty } = req.body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Bölüm kodu ve adı zorunludur',
      });
    }

    // Check if department code already exists
    const existingDept = await Department.findOne({ where: { code: code.toUpperCase() } });
    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: 'Bu bölüm kodu zaten mevcut',
      });
    }

    // Create department
    const department = await Department.create({
      code: code.toUpperCase(),
      name,
      faculty: faculty || null,
      is_active: true,
    });

    logger.info(`Department created: ${department.code} by admin ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Bölüm başarıyla oluşturuldu',
      data: department,
    });
  } catch (error) {
    logger.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm oluşturulurken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Update a department (admin only)
 * PUT /api/v1/users/departments/:id
 */
const updateDepartment = async (req, res) => {
  try {
    const db = require('../models');
    const { Department } = db;
    const { id } = req.params;
    const { code, name, faculty, is_active } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Bölüm bulunamadı',
      });
    }

    // Check if new code conflicts with another department
    if (code && code.toUpperCase() !== department.code) {
      const existingDept = await Department.findOne({ 
        where: { code: code.toUpperCase() } 
      });
      if (existingDept) {
        return res.status(400).json({
          success: false,
          message: 'Bu bölüm kodu başka bir bölüm tarafından kullanılıyor',
        });
      }
    }

    // Update department
    await department.update({
      code: code ? code.toUpperCase() : department.code,
      name: name || department.name,
      faculty: faculty !== undefined ? faculty : department.faculty,
      is_active: is_active !== undefined ? is_active : department.is_active,
    });

    logger.info(`Department updated: ${department.code} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Bölüm başarıyla güncellendi',
      data: department,
    });
  } catch (error) {
    logger.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm güncellenirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Delete a department (admin only)
 * DELETE /api/v1/users/departments/:id
 */
const deleteDepartment = async (req, res) => {
  try {
    const db = require('../models');
    const { Department, Student, Faculty, Course } = db;
    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Bölüm bulunamadı',
      });
    }

    // Check if department has students, faculty, or courses
    const studentCount = await Student.count({ where: { department_id: id } });
    const facultyCount = await Faculty.count({ where: { department_id: id } });
    const courseCount = await Course.count({ where: { department_id: id } });

    if (studentCount > 0 || facultyCount > 0 || courseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Bu bölüm silinemez. ${studentCount} öğrenci, ${facultyCount} öğretim üyesi ve ${courseCount} ders bu bölüme bağlı.`,
      });
    }

    const deptCode = department.code;
    await department.destroy();

    logger.info(`Department deleted: ${deptCode} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Bölüm başarıyla silindi',
    });
  } catch (error) {
    logger.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm silinirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Update student department
 * PUT /api/v1/users/students/department
 */
const updateStudentDepartment = async (req, res) => {
  try {
    const db = require('../models');
    const { Student, Department } = db;
    const { departmentId } = req.body;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Bölüm seçimi zorunludur',
      });
    }

    // Verify department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Bölüm bulunamadı',
      });
    }

    // Find student profile
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Öğrenci profili bulunamadı',
      });
    }

    // Update department
    await student.update({ department_id: departmentId });

    logger.info(`Student ${student.id} updated department to ${departmentId}`);

    res.json({
      success: true,
      message: 'Bölüm başarıyla güncellendi',
      data: {
        departmentId: department.id,
        departmentName: department.name,
        departmentCode: department.code,
      },
    });
  } catch (error) {
    logger.error('Update student department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm güncellenirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get student profile with department info
 * GET /api/v1/users/students/profile
 */
const getStudentProfile = async (req, res) => {
  try {
    const db = require('../models');
    const { Student, Department, User } = db;

    const student = await Student.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code', 'faculty'] },
      ],
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Öğrenci profili bulunamadı',
      });
    }

    res.json({
      success: true,
      data: {
        id: student.id,
        studentNumber: student.student_number,
        department: student.department ? {
          id: student.department.id,
          name: student.department.name,
          code: student.department.code,
          faculty: student.department.faculty,
        } : null,
        currentSemester: student.current_semester,
        gpa: student.gpa,
        cgpa: student.cgpa,
        status: student.status,
        enrollmentDate: student.enrollment_date,
      },
    });
  } catch (error) {
    logger.error('Get student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenci profili alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Update faculty department
 * PUT /api/v1/users/faculty/department
 */
const updateFacultyDepartment = async (req, res) => {
  try {
    const db = require('../models');
    const { Faculty, Department } = db;
    const { departmentId } = req.body;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Bölüm seçimi zorunludur',
      });
    }

    // Verify department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Bölüm bulunamadı',
      });
    }

    // Find faculty profile
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Öğretim üyesi profili bulunamadı',
      });
    }

    // Update department
    await faculty.update({ department_id: departmentId });

    logger.info(`Faculty ${faculty.id} updated department to ${department.code}`);

    res.json({
      success: true,
      message: 'Bölüm başarıyla güncellendi',
      data: {
        department: {
          id: department.id,
          name: department.name,
          code: department.code,
        },
      },
    });
  } catch (error) {
    logger.error('Update faculty department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm güncellenirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get faculty profile with department info
 * GET /api/v1/users/faculty/profile
 */
const getFacultyProfile = async (req, res) => {
  try {
    const db = require('../models');
    const { Faculty, Department } = db;

    const faculty = await Faculty.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code', 'faculty'],
        },
      ],
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Öğretim üyesi profili bulunamadı',
      });
    }

    res.json({
      success: true,
      data: {
        id: faculty.id,
        employeeNumber: faculty.employee_number,
        title: faculty.title,
        officeLocation: faculty.office_location,
        department: faculty.department ? {
          id: faculty.department.id,
          name: faculty.department.name,
          code: faculty.department.code,
          faculty: faculty.department.faculty,
        } : null,
      },
    });
  } catch (error) {
    logger.error('Get faculty profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğretim üyesi profili alınırken hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePicture,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getAllFaculty,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  updateStudentDepartment,
  getStudentProfile,
  updateFacultyDepartment,
  getFacultyProfile,
};

