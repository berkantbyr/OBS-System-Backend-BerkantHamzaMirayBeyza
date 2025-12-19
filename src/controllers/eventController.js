const eventService = require('../services/eventService');
const logger = require('../utils/logger');

/**
 * Get events
 * GET /api/v1/events
 */
const getEvents = async (req, res) => {
  try {
    const { category, date_from, date_to, status } = req.query;

    const events = await eventService.getEvents({
      category,
      date_from,
      date_to,
      status,
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    logger.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Etkinlikler alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get event by ID
 * GET /api/v1/events/:id
 */
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await eventService.getEventById(id);

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    logger.error('Get event error:', error);
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create event (admin/event manager)
 * POST /api/v1/events
 */
const createEvent = async (req, res) => {
  try {
    const eventData = req.body;

    const event = await eventService.createEvent(eventData);

    res.status(201).json({
      success: true,
      message: 'Etkinlik oluşturuldu',
      data: event,
    });
  } catch (error) {
    logger.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Etkinlik oluşturulurken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Update event
 * PUT /api/v1/events/:id
 */
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await eventService.updateEvent(id, updateData);

    res.json({
      success: true,
      message: 'Etkinlik güncellendi',
      data: event,
    });
  } catch (error) {
    logger.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete event
 * DELETE /api/v1/events/:id
 */
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    await eventService.deleteEvent(id);

    res.json({
      success: true,
      message: 'Etkinlik silindi',
    });
  } catch (error) {
    logger.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Register for event
 * POST /api/v1/events/:id/register
 */
const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { custom_fields } = req.body;

    const registration = await eventService.registerForEvent(id, userId, custom_fields);

    res.status(201).json({
      success: true,
      message: 'Etkinliğe kayıt yapıldı',
      data: registration,
    });
  } catch (error) {
    logger.error('Register for event error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Cancel event registration
 * DELETE /api/v1/events/:eventId/registrations/:regId
 */
const cancelRegistration = async (req, res) => {
  try {
    const { eventId, regId } = req.params;
    const userId = req.user.id;

    const result = await eventService.cancelRegistration(eventId, regId, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Cancel registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get user's event registrations
 * GET /api/v1/events/my-registrations
 */
const getMyEventRegistrations = async (req, res) => {
  try {
    const userId = req.user.id;

    const registrations = await eventService.getUserEventRegistrations(userId);

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    logger.error('Get my registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Kayıtlar alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get event registrations (event manager)
 * GET /api/v1/events/:id/registrations
 */
const getEventRegistrations = async (req, res) => {
  try {
    const { id } = req.params;

    const registrations = await eventService.getEventRegistrations(id);

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    logger.error('Get registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Kayıtlar alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get registration by QR code (for scanning)
 * GET /api/v1/events/registrations/qr/:qrCode
 */
const getRegistrationByQR = async (req, res) => {
  try {
    const { qrCode } = req.params;

    const registration = await eventService.getRegistrationByQR(qrCode);

    res.json({
      success: true,
      data: registration,
    });
  } catch (error) {
    logger.error('Get registration by QR error:', error);
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Check-in to event
 * POST /api/v1/events/:eventId/registrations/:regId/checkin
 */
const checkIn = async (req, res) => {
  try {
    const { eventId, regId } = req.params;
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        message: 'QR kod gerekli',
      });
    }

    const result = await eventService.checkIn(eventId, regId, qr_code);

    res.json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    logger.error('Check-in error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getMyEventRegistrations,
  getEventRegistrations,
  getRegistrationByQR,
  checkIn,
};

