const express = require('express');
const router = express.Router();

// Part 1 - Auth & User Routes
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');

// Part 2 - Academic Management Routes
const courseRoutes = require('./courseRoutes');
const sectionRoutes = require('./sectionRoutes');
const enrollmentRoutes = require('./enrollmentRoutes');
const gradeRoutes = require('./gradeRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const classroomRoutes = require('./classroomRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Part 2 Routes
router.use('/courses', courseRoutes);
router.use('/sections', sectionRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/grades', gradeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/classrooms', classroomRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: {
      authentication: true,
      courses: true,
      enrollment: true,
      grades: true,
      attendance: true,
      gps: true,
    },
  });
});

module.exports = router;
