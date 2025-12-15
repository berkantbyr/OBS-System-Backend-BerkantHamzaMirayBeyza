const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const certificateController = require('../controllers/certificateController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadProfilePicture, handleUploadError } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { profileUpdateSchema, passwordChangeSchema, paginationSchema } = require('../utils/validators');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', userController.getProfile);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', validate(profileUpdateSchema), userController.updateProfile);

/**
 * @route   POST /api/v1/users/me/profile-picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/me/profile-picture', uploadProfilePicture, handleUploadError, userController.updateProfilePicture);

/**
 * @route   PUT /api/v1/users/me/password
 * @desc    Change password
 * @access  Private
 */
router.put('/me/password', validate(passwordChangeSchema), userController.changePassword);

// Admin only routes
/**
 * @route   GET /api/v1/users/faculty
 * @desc    Get all faculty members (for dropdowns)
 * @access  Admin only
 */
router.get('/faculty', authorize('admin'), userController.getAllFaculty);

/**
 * @route   GET /api/v1/users/departments
 * @desc    Get all departments (for dropdowns)
 * @access  Authenticated
 */
router.get('/departments', userController.getAllDepartments);

/**
 * @route   POST /api/v1/users/departments
 * @desc    Create a new department
 * @access  Admin only
 */
router.post('/departments', authorize('admin'), userController.createDepartment);

/**
 * @route   PUT /api/v1/users/departments/:id
 * @desc    Update a department
 * @access  Admin only
 */
router.put('/departments/:id', authorize('admin'), userController.updateDepartment);

/**
 * @route   DELETE /api/v1/users/departments/:id
 * @desc    Delete a department
 * @access  Admin only
 */
router.delete('/departments/:id', authorize('admin'), userController.deleteDepartment);

/**
 * @route   GET /api/v1/users/students/certificate
 * @desc    Generate student certificate PDF
 * @access  Student only
 */
router.get('/students/certificate', authorize('student'), certificateController.generateCertificate);

/**
 * @route   GET /api/v1/users/students/profile
 * @desc    Get student profile with department info
 * @access  Student only
 */
router.get('/students/profile', authorize('student'), userController.getStudentProfile);

/**
 * @route   PUT /api/v1/users/students/department
 * @desc    Update student department
 * @access  Student only
 */
router.put('/students/department', authorize('student'), userController.updateStudentDepartment);

/**
 * @route   GET /api/v1/users/faculty/profile
 * @desc    Get faculty profile with department info
 * @access  Faculty only
 */
router.get('/faculty/profile', authorize('faculty'), userController.getFacultyProfile);

/**
 * @route   PUT /api/v1/users/faculty/department
 * @desc    Update faculty department
 * @access  Faculty only
 */
router.put('/faculty/department', authorize('faculty'), userController.updateFacultyDepartment);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (with pagination, filtering, search)
 * @access  Admin only
 */
router.get('/', authorize('admin'), validate(paginationSchema, 'query'), userController.getAllUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Admin only
 */
router.get('/:id', authorize('admin'), userController.getUserById);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Update user status (activate/deactivate)
 * @access  Admin only
 */
router.patch('/:id/status', authorize('admin'), userController.updateUserStatus);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin only
 */
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;

