const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece JPG ve PNG formatları desteklenmektedir'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

/**
 * User Routes
 * Base path: /api/v1/users
 */

// ==================== PROFILE ROUTES ====================

// Get current user profile
router.get('/me', authenticate, userController.getProfile);

// Update current user profile
router.put('/me', authenticate, userController.updateProfile);

// Change password
router.put('/me/password', authenticate, userController.changePassword);

// Upload profile picture
router.post('/me/profile-picture', authenticate, upload.single('profilePicture'), userController.uploadProfilePicture);

// ==================== DEPARTMENT ROUTES ====================

// Get all departments (public - for registration/profile)
router.get('/departments', userController.getAllDepartments);

// Seed all departments (admin only) - adds 26 departments
// Note: Must be BEFORE /departments/:id routes
router.post('/departments/seed', authenticate, authorize('admin'), userController.seedDepartments);

// Create department (admin only)
router.post('/departments', authenticate, authorize('admin'), userController.createDepartment);

// Update department (admin only)
router.put('/departments/:id', authenticate, authorize('admin'), userController.updateDepartment);

// Delete department (admin only)
router.delete('/departments/:id', authenticate, authorize('admin'), userController.deleteDepartment);

// ==================== STUDENT ROUTES ====================

// Update student department
router.put('/students/department', authenticate, authorize('student'), userController.updateStudentDepartment);

// Download student certificate
router.get('/students/certificate', authenticate, authorize('student'), userController.downloadCertificate);

// ==================== FACULTY ROUTES ====================

// Get all faculty members
router.get('/faculty', authenticate, userController.getAllFaculty);

// Update faculty department
router.put('/faculty/department', authenticate, authorize('faculty'), userController.updateFacultyDepartment);

// ==================== ADMIN ROUTES ====================

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), userController.getAllUsers);

// Update user status (admin only)
router.patch('/:id/status', authenticate, authorize('admin'), userController.updateUserStatus);

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

module.exports = router;

