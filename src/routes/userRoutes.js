const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
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

