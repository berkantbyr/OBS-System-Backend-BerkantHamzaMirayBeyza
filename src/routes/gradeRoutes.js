const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const gradeController = require('../controllers/gradeController');

/**
 * Grade Routes
 * Base path: /api/v1/grades
 */

// Get my grades (student)
router.get('/my-grades', authenticate, authorize('student'), gradeController.getMyGrades);

// Get transcript JSON (student)
router.get('/transcript', authenticate, authorize('student'), gradeController.getTranscript);

// Get transcript PDF (student)
router.get('/transcript/pdf', authenticate, authorize('student'), gradeController.getTranscriptPDF);

// Enter grades (faculty/admin)
router.post('/', authenticate, authorize('faculty', 'admin'), gradeController.enterGrades);

// Bulk enter grades (faculty/admin)
router.post('/bulk', authenticate, authorize('faculty', 'admin'), gradeController.bulkEnterGrades);

module.exports = router;


