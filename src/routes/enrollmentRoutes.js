const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const enrollmentController = require('../controllers/enrollmentController');

/**
 * Enrollment Routes
 * Base path: /api/v1/enrollments
 */

// ==================== STUDENT ROUTES ====================

// Get my courses (student)
router.get('/my-courses', authenticate, authorize('student'), enrollmentController.getMyCourses);

// Get my schedule (student)
router.get('/schedule', authenticate, authorize('student'), enrollmentController.getMySchedule);

// Check enrollment eligibility (student)
router.get('/check/:sectionId', authenticate, authorize('student'), enrollmentController.checkEligibility);

// Enroll in a course (student) - Creates pending enrollment
router.post('/', authenticate, authorize('student'), enrollmentController.enrollInCourse);

// Drop a course (student)
router.delete('/:id', authenticate, authorize('student'), enrollmentController.dropCourse);

// ==================== FACULTY ROUTES ====================

// Get pending enrollments for faculty's sections
router.get('/pending', authenticate, authorize('faculty'), enrollmentController.getPendingEnrollments);

// Approve a pending enrollment (faculty)
router.put('/:id/approve', authenticate, authorize('faculty'), enrollmentController.approveEnrollment);

// Reject a pending enrollment (faculty)
router.put('/:id/reject', authenticate, authorize('faculty'), enrollmentController.rejectEnrollment);

// Bulk approve enrollments (faculty)
router.put('/approve-all', authenticate, authorize('faculty'), enrollmentController.approveAllEnrollments);

// ==================== FACULTY/ADMIN ROUTES ====================

// Get section students (faculty/admin)
router.get('/students/:sectionId', authenticate, authorize('faculty', 'admin'), enrollmentController.getSectionStudents);

module.exports = router;



