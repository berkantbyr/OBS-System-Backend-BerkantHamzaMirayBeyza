const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateCampusIP, logClientIP } = require('../middleware/ipValidation');
const attendanceController = require('../controllers/attendanceController');
const excuseController = require('../controllers/excuseController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for excuse document uploads
const excuseUploadDir = path.join(__dirname, '../../uploads/excuses');
if (!fs.existsSync(excuseUploadDir)) {
  fs.mkdirSync(excuseUploadDir, { recursive: true });
}

const excuseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, excuseUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `excuse-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const excuseUpload = multer({
  storage: excuseStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
  },
});

/**
 * Attendance Routes
 * Base path: /api/v1/attendance
 */

// ========== Session Routes ==========

// Get instructor's sessions (faculty)
router.get('/sessions/my-sessions', authenticate, authorize('faculty', 'admin'), attendanceController.getInstructorSessions);

// Create session (faculty)
router.post('/sessions', authenticate, authorize('faculty', 'admin'), attendanceController.createSession);

// Get session details
router.get('/sessions/:id', authenticate, attendanceController.getSession);

// Close session (faculty)
router.put('/sessions/:id/close', authenticate, authorize('faculty', 'admin'), attendanceController.closeSession);

// Student check-in (requires campus IP)
router.post('/sessions/:id/checkin', authenticate, authorize('student'), validateCampusIP, attendanceController.checkIn);

// Regenerate QR code (faculty) - 5 second refresh
router.post('/sessions/:id/regenerate-qr', authenticate, authorize('faculty', 'admin'), attendanceController.regenerateQRCode);

// Get current QR code for session (student)
router.get('/sessions/:id/qr', authenticate, authorize('student'), attendanceController.getCurrentQRCode);

// ========== Student Routes ==========

// Get active sessions for student
router.get('/active-sessions', authenticate, authorize('student'), attendanceController.getActiveSessions);

// Get my sessions for excuse request (student)
router.get('/my-sessions', authenticate, authorize('student'), attendanceController.getMySessions);

// Get my attendance (student)
router.get('/my-attendance', authenticate, authorize('student'), attendanceController.getMyAttendance);

// ========== Report Routes ==========

// Get attendance report for section (faculty/admin)
router.get('/report/:sectionId', authenticate, authorize('faculty', 'admin'), attendanceController.getAttendanceReport);

// ========== Excuse Request Routes ==========

// Get my excuse requests (student)
router.get('/my-excuse-requests', authenticate, authorize('student'), excuseController.getMyExcuseRequests);

// Create excuse request (student)
router.post('/excuse-requests', authenticate, authorize('student'), excuseUpload.single('document'), excuseController.createExcuseRequest);

// Get excuse requests (faculty/admin)
router.get('/excuse-requests', authenticate, authorize('faculty', 'admin'), excuseController.getExcuseRequests);

// Approve excuse request (faculty/admin)
router.put('/excuse-requests/:id/approve', authenticate, authorize('faculty', 'admin'), excuseController.approveExcuseRequest);

// Reject excuse request (faculty/admin)
router.put('/excuse-requests/:id/reject', authenticate, authorize('faculty', 'admin'), excuseController.rejectExcuseRequest);

module.exports = router;

