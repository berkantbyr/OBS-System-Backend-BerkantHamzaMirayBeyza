const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

/**
 * Dashboard Routes
 * Base path: /api/v1/dashboard
 */

// Get dashboard stats based on user role
router.get('/stats', authenticate, dashboardController.getDashboardStats);

// Get recent activities
router.get('/activities', authenticate, dashboardController.getRecentActivities);

module.exports = router;
