const db = require('../models');
const { User, Student, Faculty, Department } = db;
const { hashPassword, comparePassword } = require('../utils/password');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Student,
          as: 'student',
          include: [{ model: Department, as: 'department' }],
        },
        {
          model: Faculty,
          as: 'faculty',
          include: [{ model: Department, as: 'department' }],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profil bilgileri alınırken hata oluştu',
    });
  }
};

/**
 * Update current user profile
 * PUT /api/v1/users/me
 */
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    await user.update({
      first_name: firstName || user.first_name,
      last_name: lastName || user.last_name,
      phone: phone !== undefined ? phone : user.phone,
    });

    res.json({
      success: true,
      message: 'Profil güncellendi',
      data: {
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profil güncellenirken hata oluştu',
    });
  }
};

/**
 * Change password
 * PUT /api/v1/users/me/password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Mevcut şifre hatalı',
      });
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(newPassword);
    await user.update({ password_hash: hashedPassword });

    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre değiştirilirken hata oluştu',
    });
  }
};

/**
 * Upload profile picture
 * POST /api/v1/users/me/profile-picture
 */
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Dosya yüklenmedi',
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    // Save relative path
    const relativePath = `/uploads/profiles/${req.file.filename}`;
    await user.update({ profile_picture_url: relativePath });

    res.json({
      success: true,
      message: 'Profil fotoğrafı güncellendi',
      data: {
        profilePictureUrl: relativePath,
      },
    });
  } catch (error) {
    logger.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Fotoğraf yüklenirken hata oluştu',
    });
  }
};

/**
 * Get all users (admin only)
 * GET /api/v1/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const where = {};
    if (role) where.role = role;
    if (status === 'active') where.is_active = true;
    if (status === 'inactive') where.is_active = false;

    const users = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Student, as: 'student', include: [{ model: Department, as: 'department' }] },
        { model: Faculty, as: 'faculty', include: [{ model: Department, as: 'department' }] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: {
          total: users.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(users.count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar alınırken hata oluştu',
    });
  }
};

/**
 * Get all faculty members
 * GET /api/v1/users/faculty
 */
const getAllFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      ],
      order: [[{ model: User, as: 'user' }, 'first_name', 'ASC']],
    });

    res.json({
      success: true,
      data: faculty,
    });
  } catch (error) {
    logger.error('Get all faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğretim üyeleri alınırken hata oluştu',
    });
  }
};

// ==================== DEPARTMENT ENDPOINTS ====================

/**
 * Get all departments
 * GET /api/v1/users/departments
 */
const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: { is_active: true },
      attributes: ['id', 'code', 'name', 'faculty'],
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
    });
  }
};

/**
 * Create department (admin only)
 * POST /api/v1/users/departments
 */
const createDepartment = async (req, res) => {
  try {
    const { code, name, faculty, description } = req.body;

    // Check if department code exists
    const existing = await Department.findOne({ where: { code } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Bu bölüm kodu zaten kullanılıyor',
      });
    }

    const department = await Department.create({
      code,
      name,
      faculty,
      description,
      is_active: true,
    });

    res.status(201).json({
      success: true,
      message: 'Bölüm oluşturuldu',
      data: department,
    });
  } catch (error) {
    logger.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm oluşturulurken hata oluştu',
    });
  }
};

/**
 * Update department (admin only)
 * PUT /api/v1/users/departments/:id
 */
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, faculty, description, is_active } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Bölüm bulunamadı',
      });
    }

    await department.update({
      code: code || department.code,
      name: name || department.name,
      faculty: faculty || department.faculty,
      description: description !== undefined ? description : department.description,
      is_active: is_active !== undefined ? is_active : department.is_active,
    });

    res.json({
      success: true,
      message: 'Bölüm güncellendi',
      data: department,
    });
  } catch (error) {
    logger.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm güncellenirken hata oluştu',
    });
  }
};

/**
 * Delete department (admin only)
 * DELETE /api/v1/users/departments/:id
 */
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Bölüm bulunamadı',
      });
    }

    // Soft delete - just deactivate
    await department.update({ is_active: false });

    res.json({
      success: true,
      message: 'Bölüm silindi',
    });
  } catch (error) {
    logger.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm silinirken hata oluştu',
    });
  }
};

// ==================== STUDENT ENDPOINTS ====================

/**
 * Update student department
 * PUT /api/v1/users/students/department
 */
const updateStudentDepartment = async (req, res) => {
  try {
    const { departmentId } = req.body;

    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    // Verify department exists
    if (departmentId) {
      const department = await Department.findByPk(departmentId);
      if (!department || !department.is_active) {
        return res.status(404).json({
          success: false,
          message: 'Bölüm bulunamadı',
        });
      }
    }

    await student.update({ department_id: departmentId || null });

    // Get updated student with department
    const updatedStudent = await Student.findByPk(student.id, {
      include: [{ model: Department, as: 'department' }],
    });

    res.json({
      success: true,
      message: 'Bölüm güncellendi',
      data: updatedStudent,
    });
  } catch (error) {
    logger.error('Update student department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm güncellenirken hata oluştu',
    });
  }
};

/**
 * Download student certificate
 * GET /api/v1/users/students/certificate
 */
const downloadCertificate = async (req, res) => {
  try {
    logger.info(`📄 Certificate download request - User: ${req.user.id}`);

    const student = await Student.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'user', required: false },
        { model: Department, as: 'department', required: false },
      ],
    });

    if (!student) {
      logger.warn(`❌ Student not found for user: ${req.user.id}`);
      return res.status(404).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    // Get user info if not included
    let userInfo = student.user;
    if (!userInfo) {
      userInfo = await User.findByPk(req.user.id);
    }

    if (!userInfo) {
      logger.warn(`❌ User info not found for student: ${student.id}`);
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bilgileri bulunamadı',
      });
    }

    logger.info(`✅ Student found: ${student.student_number}`);

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Handle PDF errors
    doc.on('error', (err) => {
      logger.error('PDF generation error:', err);
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ogrenci_belgesi_${student.student_number || 'unknown'}.pdf`);

    doc.pipe(res);

    // Use Helvetica (built-in, supports basic characters)
    // Note: For full Turkish support, custom fonts should be deployed with the app
    const fontRegular = 'Helvetica';
    const fontBold = 'Helvetica-Bold';

    // Try to load custom fonts if available
    try {
      const fontDir = path.join(__dirname, '../assets/fonts');
      const robotoRegular = path.join(fontDir, 'Roboto-Regular.ttf');
      const robotoBold = path.join(fontDir, 'Roboto-Bold.ttf');

      if (fs.existsSync(robotoRegular) && fs.existsSync(robotoBold)) {
        doc.registerFont('Roboto', robotoRegular);
        doc.registerFont('Roboto-Bold', robotoBold);
        logger.info('✅ Custom fonts loaded successfully');
      } else {
        logger.info('ℹ️ Using built-in Helvetica font (custom fonts not found)');
      }
    } catch (fontError) {
      logger.warn('⚠️ Font loading failed, using Helvetica:', fontError.message);
    }

    // Safe text helper - converts Turkish characters to ASCII equivalents for Helvetica
    const safeText = (text) => {
      if (!text) return '-';
      // If using Helvetica, convert Turkish chars
      return String(text)
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C');
    };

    // Header
    doc.font(fontBold).fontSize(20).text(safeText('UNIVERSITE OBS SISTEMI'), { align: 'center' });
    doc.moveDown(0.5);
    doc.font(fontBold).fontSize(16).text(safeText('OGRENCI BELGESI'), { align: 'center', underline: true });
    doc.moveDown(0.5);
    doc.font(fontRegular).fontSize(10).text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'right' });
    doc.moveDown(2);

    // Student info table
    const labelX = 60;
    const valueX = 200;
    let y = doc.y;

    const addRow = (label, value) => {
      doc.font(fontBold).fontSize(11).text(safeText(label), labelX, y);
      doc.font(fontRegular).fontSize(11).text(`: ${safeText(value)}`, valueX, y);
      y += 20;
    };

    const firstName = userInfo.first_name || 'Bilinmiyor';
    const lastName = userInfo.last_name || 'Bilinmiyor';
    const fullName = `${firstName} ${lastName}`;
    const citizenshipId = userInfo.citizenship_id;
    const departmentName = student.department?.name || 'Belirtilmemis';

    addRow('Ogrenci Numarasi', student.student_number || '-');
    addRow('Adi Soyadi', fullName);
    addRow('T.C. Kimlik No', citizenshipId ? `***********${citizenshipId.slice(-2)}` : '**');
    addRow('Sinifi', `${student.current_semester || 1}. Sinif`);
    addRow('Ogrenim Turu', 'Orgun Ogretim');
    addRow('Durumu', student.status === 'active' ? 'Aktif' : 'Pasif');
    addRow('Kayit Tarihi', student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('tr-TR') : '-');
    addRow('Genel Not Ortalamasi', student.cgpa?.toFixed(2) || '0.00');

    doc.moveDown(2);

    // Description text
    const descriptionText = `Yukarida kimlik bilgileri yer alan ${safeText(fullName)}, ` +
      `universitemizin ${safeText(departmentName)} bolumu ogrencisidir. ` +
      `Bu belge, ilgili makama sunulmak uzere, ogrencinin istegi uzerine duzenlenmistir.`;
    
    doc.font(fontRegular).fontSize(10).text(descriptionText, labelX, doc.y, { width: 450, align: 'justify' });

    // Signature area
    doc.moveDown(4);
    doc.font(fontBold).fontSize(10).text(safeText('Ogrenci Isleri Daire Baskanligi'), { align: 'right' });
    doc.font(fontRegular).fontSize(9).text(safeText('(Muhur / Imza)'), { align: 'right' });

    // QR Code placeholder
    const qrY = doc.y;
    doc.rect(60, qrY, 60, 60).stroke();
    doc.font(fontRegular).fontSize(7).text(safeText('Dogrulama Kodu'), 65, qrY + 25);

    // Footer
    const bottom = doc.page.height - 60;
    doc.font(fontRegular).fontSize(8).text(
      safeText('Bu belge elektronik ortamda uretilmistir.'),
      50, bottom, { align: 'center', width: 500 }
    );

    doc.end();
    logger.info(`✅ Certificate PDF generated for student: ${student.student_number}`);
  } catch (error) {
    logger.error('❌ Download certificate error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    
    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Belge oluşturulurken hata oluştu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
};

// ==================== FACULTY ENDPOINTS ====================

/**
 * Update faculty department
 * PUT /api/v1/users/faculty/department
 */
const updateFacultyDepartment = async (req, res) => {
  try {
    const { departmentId } = req.body;

    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Öğretim üyesi kaydı bulunamadı',
      });
    }

    // Verify department exists
    if (departmentId) {
      const department = await Department.findByPk(departmentId);
      if (!department || !department.is_active) {
        return res.status(404).json({
          success: false,
          message: 'Bölüm bulunamadı',
        });
      }
    }

    await faculty.update({ department_id: departmentId || null });

    // Get updated faculty with department
    const updatedFaculty = await Faculty.findByPk(faculty.id, {
      include: [{ model: Department, as: 'department' }],
    });

    res.json({
      success: true,
      message: 'Bölüm güncellendi',
      data: updatedFaculty,
    });
  } catch (error) {
    logger.error('Update faculty department error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölüm güncellenirken hata oluştu',
    });
  }
};

/**
 * Update user status (admin only)
 * PATCH /api/v1/users/:id/status
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    await user.update({ is_active: isActive });

    res.json({
      success: true,
      message: `Kullanıcı ${isActive ? 'aktif edildi' : 'devre dışı bırakıldı'}`,
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı durumu güncellenirken hata oluştu',
    });
  }
};

/**
 * Delete user (admin only)
 * DELETE /api/v1/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    // Soft delete - just deactivate
    await user.update({ is_active: false });

    res.json({
      success: true,
      message: 'Kullanıcı silindi',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinirken hata oluştu',
    });
  }
};

/**
 * Seed all departments (admin only)
 * POST /api/v1/users/departments/seed
 */
const seedDepartments = async (req, res) => {
  try {
    const departments = [
      // Mühendislik Fakültesi
      { code: 'CSE', name: 'Bilgisayar Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
      { code: 'EE', name: 'Elektrik-Elektronik Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
      { code: 'ME', name: 'Makine Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
      { code: 'CE', name: 'İnşaat Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
      { code: 'IE', name: 'Endüstri Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
      { code: 'CHE', name: 'Kimya Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
      // Fen Fakültesi
      { code: 'MATH', name: 'Matematik', faculty: 'Fen Fakültesi', is_active: true },
      { code: 'PHYS', name: 'Fizik', faculty: 'Fen Fakültesi', is_active: true },
      { code: 'CHEM', name: 'Kimya', faculty: 'Fen Fakültesi', is_active: true },
      { code: 'BIO', name: 'Biyoloji', faculty: 'Fen Fakültesi', is_active: true },
      { code: 'STAT', name: 'İstatistik', faculty: 'Fen Fakültesi', is_active: true },
      // İşletme Fakültesi
      { code: 'BA', name: 'İşletme', faculty: 'İşletme Fakültesi', is_active: true },
      { code: 'ECON', name: 'Ekonomi', faculty: 'İşletme Fakültesi', is_active: true },
      { code: 'FIN', name: 'Finans', faculty: 'İşletme Fakültesi', is_active: true },
      { code: 'MIS', name: 'Yönetim Bilişim Sistemleri', faculty: 'İşletme Fakültesi', is_active: true },
      // Hukuk Fakültesi
      { code: 'LAW', name: 'Hukuk', faculty: 'Hukuk Fakültesi', is_active: true },
      // Tıp Fakültesi
      { code: 'MED', name: 'Tıp', faculty: 'Tıp Fakültesi', is_active: true },
      // Edebiyat Fakültesi
      { code: 'PSY', name: 'Psikoloji', faculty: 'Edebiyat Fakültesi', is_active: true },
      { code: 'SOC', name: 'Sosyoloji', faculty: 'Edebiyat Fakültesi', is_active: true },
      { code: 'HIST', name: 'Tarih', faculty: 'Edebiyat Fakültesi', is_active: true },
      { code: 'ENG', name: 'İngiliz Dili ve Edebiyatı', faculty: 'Edebiyat Fakültesi', is_active: true },
      { code: 'TUR', name: 'Türk Dili ve Edebiyatı', faculty: 'Edebiyat Fakültesi', is_active: true },
      // Mimarlık Fakültesi
      { code: 'ARCH', name: 'Mimarlık', faculty: 'Mimarlık Fakültesi', is_active: true },
      { code: 'ID', name: 'İç Mimarlık', faculty: 'Mimarlık Fakültesi', is_active: true },
      // İletişim Fakültesi
      { code: 'COMM', name: 'İletişim', faculty: 'İletişim Fakültesi', is_active: true },
      { code: 'PR', name: 'Halkla İlişkiler', faculty: 'İletişim Fakültesi', is_active: true },
    ];

    let addedCount = 0;
    let updatedCount = 0;

    for (const dept of departments) {
      const [department, created] = await Department.findOrCreate({
        where: { code: dept.code },
        defaults: dept,
      });

      if (created) {
        addedCount++;
      } else if (!department.is_active) {
        await department.update({ is_active: true });
        updatedCount++;
      }
    }

    logger.info(`Departments seeded: ${addedCount} added, ${updatedCount} activated`);

    res.json({
      success: true,
      message: `${addedCount} bölüm eklendi, ${updatedCount} bölüm aktif edildi`,
      data: {
        added: addedCount,
        updated: updatedCount,
        total: departments.length,
      },
    });
  } catch (error) {
    logger.error('Seed departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölümler eklenirken hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  getAllUsers,
  getAllFaculty,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  updateStudentDepartment,
  downloadCertificate,
  updateFacultyDepartment,
  updateUserStatus,
  deleteUser,
  seedDepartments,
};

