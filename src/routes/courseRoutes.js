const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const courseController = require('../controllers/courseController');

/**
 * Course Routes
 * Base path: /api/v1/courses
 */

// Get all courses (public with optional auth)
router.get('/', authenticate, courseController.getCourses);

// Get course by ID (public with optional auth)
router.get('/:id', authenticate, courseController.getCourseById);

// Create course (admin only)
router.post('/', authenticate, authorize('admin'), courseController.createCourse);

// Update course (admin only)
router.put('/:id', authenticate, authorize('admin'), courseController.updateCourse);

// Delete course (admin only)
router.delete('/:id', authenticate, authorize('admin'), courseController.deleteCourse);

module.exports = router;

