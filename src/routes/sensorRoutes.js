const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { authenticate, authorize } = require('../middleware/auth');

// All sensor routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/sensors
 * @desc    Get all sensors with filters
 * @access  Authenticated users
 * @query   type, status, building, page, limit
 */
router.get('/', sensorController.getAllSensors);

/**
 * @route   GET /api/v1/sensors/latest
 * @desc    Get latest readings for all active sensors
 * @access  Authenticated users
 */
router.get('/latest', sensorController.getLatestReadings);

/**
 * @route   POST /api/v1/sensors/simulate
 * @desc    Simulate sensor data for demo purposes
 * @access  Admin only
 */
router.post('/simulate', authorize('admin'), sensorController.simulateSensorData);

/**
 * @route   GET /api/v1/sensors/:id
 * @desc    Get sensor by ID
 * @access  Authenticated users
 */
router.get('/:id', sensorController.getSensorById);

/**
 * @route   GET /api/v1/sensors/:id/data
 * @desc    Get sensor data with optional aggregation
 * @access  Authenticated users
 * @query   startDate, endDate, aggregation (hour|day|raw), limit
 */
router.get('/:id/data', sensorController.getSensorData);

/**
 * @route   POST /api/v1/sensors
 * @desc    Create new sensor
 * @access  Admin only
 */
router.post('/', authorize('admin'), sensorController.createSensor);

/**
 * @route   POST /api/v1/sensors/:id/data
 * @desc    Record sensor data (IoT endpoint)
 * @access  Admin or IoT devices
 */
router.post('/:id/data', sensorController.recordSensorData);

module.exports = router;
