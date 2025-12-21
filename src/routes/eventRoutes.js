const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const eventController = require('../controllers/eventController');

/**
 * Event Routes
 * Base path: /api/v1/events
 */

// Event routes
router.get('/', authenticate, eventController.getEvents);
router.post('/', authenticate, authorize('admin', 'faculty'), eventController.createEvent);

// Registration routes (must be before /:id routes to avoid route conflicts)
router.get('/my-registrations', authenticate, eventController.getMyEventRegistrations);
router.get('/registrations/qr/:qrCode', authenticate, authorize('admin', 'event_manager'), eventController.getRegistrationByQR);

// Event detail routes (must be after specific routes)
router.get('/:id', authenticate, eventController.getEventById);
router.put('/:id', authenticate, authorize('admin', 'event_manager'), eventController.updateEvent);
router.delete('/:id', authenticate, authorize('admin', 'event_manager'), eventController.deleteEvent);
router.post('/:id/register', authenticate, eventController.registerForEvent);
router.get('/:id/registrations', authenticate, authorize('admin', 'event_manager'), eventController.getEventRegistrations);
router.delete('/:eventId/registrations/:regId', authenticate, eventController.cancelRegistration);
router.post('/:eventId/registrations/:regId/checkin', authenticate, authorize('admin', 'event_manager'), eventController.checkIn);

module.exports = router;

