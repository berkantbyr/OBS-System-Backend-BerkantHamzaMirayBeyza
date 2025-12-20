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

// Part 3 - Additional Feature Routes
const announcementRoutes = require('./announcementRoutes');
const calendarRoutes = require('./calendarRoutes');
const dashboardRoutes = require('./dashboardRoutes');

// Part 4 - Meal, Event, Scheduling Routes
const mealRoutes = require('./mealRoutes');
// const walletRoutes = require('./walletRoutes'); // Wallet system removed - all reservations are free
const eventRoutes = require('./eventRoutes');
const schedulingRoutes = require('./schedulingRoutes');
const reservationRoutes = require('./reservationRoutes');

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

// Part 3 Routes
router.use('/announcements', announcementRoutes);
router.use('/calendar', calendarRoutes);
router.use('/dashboard', dashboardRoutes);

// Part 4 Routes
router.use('/meals', mealRoutes);
// router.use('/wallet', walletRoutes); // Wallet system removed - all reservations are free
router.use('/events', eventRoutes);
router.use('/scheduling', schedulingRoutes);
router.use('/reservations', reservationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    features: {
      authentication: true,
      courses: true,
      enrollment: true,
      grades: true,
      attendance: true,
      gps: true,
      dynamicQR: true,
      campusIP: true,
      announcements: true,
      academicCalendar: true,
      meals: true,
      wallet: false, // Wallet system removed - all reservations are free
      events: true,
      scheduling: true,
    },
  });
});

module.exports = router;
