const schedulingService = require('../services/schedulingService');
const reservationService = require('../services/reservationService');
const logger = require('../utils/logger');

/**
 * Generate automatic schedule
 * POST /api/v1/scheduling/generate
 */
const generateSchedule = async (req, res) => {
  try {
    const constraints = req.body;

    const result = await schedulingService.generateSchedule(constraints);

    res.status(201).json({
      success: true,
      message: 'Ders programı oluşturuldu',
      data: result,
    });
  } catch (error) {
    logger.error('Generate schedule error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get schedule by ID
 * GET /api/v1/scheduling/:scheduleId
 */
const getSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedules = await schedulingService.getSchedule(scheduleId);

    res.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    logger.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Program alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get user's schedule
 * GET /api/v1/scheduling/my-schedule
 */
const getMySchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await schedulingService.getUserSchedule(userId, userRole);

    res.json({
      success: true,
      data: result.schedule,
    });
  } catch (error) {
    logger.error('Get my schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Program alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get iCal export
 * GET /api/v1/scheduling/my-schedule/ical
 */
const getICalExport = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get raw schedule data (not formatted) for iCal
    const schedules = await schedulingService.getRawUserSchedule(userId, userRole);

    const icalContent = schedulingService.generateICal(schedules);

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="schedule.ics"');
    res.send(icalContent);
  } catch (error) {
    logger.error('Get iCal export error:', error);
    res.status(500).json({
      success: false,
      message: 'iCal dosyası oluşturulurken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Create classroom reservation
 * POST /api/v1/reservations
 */
const createReservation = async (req, res) => {
  try {
    const reservationData = req.body;
    const userId = req.user.id;

    const reservation = await reservationService.createReservation(userId, reservationData);

    res.status(201).json({
      success: true,
      message: 'Derslik rezervasyonu oluşturuldu',
      data: reservation,
    });
  } catch (error) {
    logger.error('Create reservation error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get reservations
 * GET /api/v1/reservations
 */
const getReservations = async (req, res) => {
  try {
    const { date, classroom_id, user_id } = req.query;

    const reservations = await reservationService.getReservations({
      date,
      classroom_id,
      user_id: user_id || req.user.id,
    });

    res.json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    logger.error('Get reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Rezervasyonlar alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Approve reservation (admin)
 * PUT /api/v1/reservations/:id/approve
 */
const approveReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const result = await reservationService.approveReservation(id, adminId);

    res.json({
      success: true,
      message: result.message,
      data: result.reservation,
    });
  } catch (error) {
    logger.error('Approve reservation error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Reject reservation (admin)
 * PUT /api/v1/reservations/:id/reject
 */
const rejectReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    const result = await reservationService.rejectReservation(id, adminId, reason);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Reject reservation error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  generateSchedule,
  getSchedule,
  getMySchedule,
  getICalExport,
  createReservation,
  getReservations,
  approveReservation,
  rejectReservation,
};

