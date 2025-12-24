const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

// All analytics routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get('/dashboard', analyticsController.getDashboardStats);

/**
 * @route   GET /api/v1/analytics/academic-performance
 * @desc    Get academic performance analytics (GPA by dept, grade distribution, etc.)
 * @access  Admin only
 */
router.get('/academic-performance', analyticsController.getAcademicPerformance);

/**
 * @route   GET /api/v1/analytics/attendance
 * @desc    Get attendance analytics (rates by course, trends, at-risk students)
 * @access  Admin only
 */
router.get('/attendance', analyticsController.getAttendanceAnalytics);

/**
 * @route   GET /api/v1/analytics/meal-usage
 * @desc    Get meal usage analytics (daily counts, peak hours, revenue)
 * @access  Admin only
 */
router.get('/meal-usage', analyticsController.getMealUsageAnalytics);

/**
 * @route   GET /api/v1/analytics/events
 * @desc    Get event analytics (popular events, registration rates, category breakdown)
 * @access  Admin only
 */
router.get('/events', analyticsController.getEventAnalytics);

/**
 * @route   GET /api/v1/analytics/export/:type
 * @desc    Export report (academic, attendance, meal, event)
 * @access  Admin only
 * @query   format - csv, json (default: csv)
 */
router.get('/export/:type', analyticsController.exportReport);

module.exports = router;
