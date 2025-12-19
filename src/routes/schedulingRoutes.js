const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const schedulingController = require('../controllers/schedulingController');

/**
 * Scheduling Routes
 * Base path: /api/v1/scheduling
 */

router.post('/generate', authenticate, authorize('admin'), schedulingController.generateSchedule);
router.get('/my-schedule/ical', authenticate, schedulingController.getICalExport);
router.get('/my-schedule', authenticate, schedulingController.getMySchedule);
router.get('/:scheduleId', authenticate, schedulingController.getSchedule);

module.exports = router;

