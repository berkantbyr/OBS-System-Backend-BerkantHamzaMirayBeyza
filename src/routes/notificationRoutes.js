const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// All notification routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications with pagination and filters
 * @access  Authenticated users
 * @query   page, limit, category, read, sort, order
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   GET /api/v1/notifications/recent
 * @desc    Get recent notifications for bell dropdown
 * @access  Authenticated users
 * @query   limit (default: 5)
 */
router.get('/recent', notificationController.getRecentNotifications);

/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get user notification preferences
 * @access  Authenticated users
 */
router.get('/preferences', notificationController.getPreferences);

/**
 * @route   PUT /api/v1/notifications/preferences
 * @desc    Update user notification preferences
 * @access  Authenticated users
 */
router.put('/preferences', notificationController.updatePreferences);

/**
 * @route   PUT /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Authenticated users
 */
router.put('/mark-all-read', notificationController.markAllAsRead);

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Authenticated users
 */
router.put('/:id/read', notificationController.markAsRead);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Authenticated users
 */
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
