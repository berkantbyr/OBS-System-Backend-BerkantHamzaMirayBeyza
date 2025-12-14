const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const calendarController = require('../controllers/calendarController');

/**
 * Academic Calendar Routes
 * Base path: /api/v1/calendar
 */

// Get all calendar events (authenticated)
router.get('/', authenticate, calendarController.getCalendarEvents);

// Create calendar event (admin only)
router.post('/', authenticate, authorize('admin'), calendarController.createCalendarEvent);

// Update calendar event (admin only)
router.put('/:id', authenticate, authorize('admin'), calendarController.updateCalendarEvent);

// Delete calendar event (admin only)
router.delete('/:id', authenticate, authorize('admin'), calendarController.deleteCalendarEvent);

module.exports = router;
