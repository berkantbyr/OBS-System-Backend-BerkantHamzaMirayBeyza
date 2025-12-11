const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const enrollmentController = require('../controllers/enrollmentController');

/**
 * Enrollment Routes
 * Base path: /api/v1/enrollments
 */

// Get my courses (student)
router.get('/my-courses', authenticate, authorize('student'), enrollmentController.getMyCourses);

// Get my schedule (student)
router.get('/schedule', authenticate, authorize('student'), enrollmentController.getMySchedule);

// Check enrollment eligibility (student)
router.get('/check/:sectionId', authenticate, authorize('student'), enrollmentController.checkEligibility);

// Get section students (faculty/admin)
router.get('/students/:sectionId', authenticate, authorize('faculty', 'admin'), enrollmentController.getSectionStudents);

// Enroll in a course (student)
router.post('/', authenticate, authorize('student'), enrollmentController.enrollInCourse);

// Drop a course (student)
router.delete('/:id', authenticate, authorize('student'), enrollmentController.dropCourse);

module.exports = router;

