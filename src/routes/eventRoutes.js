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
router.get('/:id', authenticate, eventController.getEventById);
router.post('/', authenticate, authorize('admin', 'event_manager'), eventController.createEvent);
router.put('/:id', authenticate, authorize('admin', 'event_manager'), eventController.updateEvent);
router.delete('/:id', authenticate, authorize('admin', 'event_manager'), eventController.deleteEvent);

// Registration routes
router.post('/:id/register', authenticate, eventController.registerForEvent);
router.get('/my-registrations', authenticate, eventController.getMyEventRegistrations);
router.get('/registrations/qr/:qrCode', authenticate, authorize('admin', 'event_manager'), eventController.getRegistrationByQR);
router.delete('/:eventId/registrations/:regId', authenticate, eventController.cancelRegistration);
router.get('/:id/registrations', authenticate, authorize('admin', 'event_manager'), eventController.getEventRegistrations);
router.post('/:eventId/registrations/:regId/checkin', authenticate, authorize('admin', 'event_manager'), eventController.checkIn);

module.exports = router;

