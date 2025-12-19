const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const schedulingController = require('../controllers/schedulingController');

/**
 * Classroom Reservation Routes
 * Base path: /api/v1/reservations
 */

router.post('/', authenticate, schedulingController.createReservation);
router.get('/', authenticate, schedulingController.getReservations);
router.put('/:id/approve', authenticate, authorize('admin'), schedulingController.approveReservation);
router.put('/:id/reject', authenticate, authorize('admin'), schedulingController.rejectReservation);

module.exports = router;

