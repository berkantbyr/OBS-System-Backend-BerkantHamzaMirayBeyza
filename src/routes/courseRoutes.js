const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const courseController = require('../controllers/courseController');

/**
 * Course Routes
 * Base path: /api/v1/courses
 */

// Get all departments (public - no auth required)
router.get('/departments', courseController.getDepartments);

// Get all courses (public - no auth required for browsing)
router.get('/', courseController.getCourses);

// Get course by ID (public with optional auth for student-specific info like prerequisite status)
router.get('/:id', optionalAuth, courseController.getCourseById);

// Create course (admin only)
router.post('/', authenticate, authorize('admin'), courseController.createCourse);

// Update course (admin only)
router.put('/:id', authenticate, authorize('admin'), courseController.updateCourse);

// Delete course (admin only)
router.delete('/:id', authenticate, authorize('admin'), courseController.deleteCourse);

module.exports = router;





