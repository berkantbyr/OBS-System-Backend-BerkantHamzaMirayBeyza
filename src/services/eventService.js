const db = require('../models');
const { Event, EventRegistration, User, Student } = db;
const qrCodeService = require('./qrCodeService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * EventService - Handles event management
 */
class EventService {
  /**
   * Get events with filters
   * @param {Object} filters - { category, date_from, date_to, status }
   * @returns {Array} - Array of events
   */
  async getEvents(filters = {}) {
    const where = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.date_from || filters.date_to) {
      where.date = {};
      if (filters.date_from) where.date[Op.gte] = filters.date_from;
      if (filters.date_to) where.date[Op.lte] = filters.date_to;
    }

    const events = await Event.findAll({
      where,
      order: [['date', 'ASC'], ['start_time', 'ASC']],
    });

    return events;
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event ID
   * @returns {Object} - Event object
   */
  async getEventById(eventId) {
    const event = await Event.findByPk(eventId);

    if (!event) {
      throw new Error('Etkinlik bulunamadı');
    }

    return event;
  }

  /**
   * Create event (admin/event manager)
   * @param {Object} eventData - Event data
   * @returns {Object} - Created event
   */
  async createEvent(eventData) {
    const event = await Event.create({
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      date: eventData.date,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      location: eventData.location,
      capacity: eventData.capacity,
      registration_deadline: eventData.registration_deadline,
      is_paid: eventData.is_paid || false,
      price: eventData.price || 0,
      status: eventData.status || 'published',
    });

    logger.info(`Event created: ${event.id}`);

    return event;
  }

  /**
   * Update event
   * @param {string} eventId - Event ID
   * @param {Object} updateData - Update data
   * @returns {Object} - Updated event
   */
  async updateEvent(eventId, updateData) {
    const event = await Event.findByPk(eventId);

    if (!event) {
      throw new Error('Etkinlik bulunamadı');
    }

    await event.update(updateData);

    logger.info(`Event updated: ${eventId}`);

    return event;
  }

  /**
   * Delete event
   * @param {string} eventId - Event ID
   */
  async deleteEvent(eventId) {
    const event = await Event.findByPk(eventId);

    if (!event) {
      throw new Error('Etkinlik bulunamadı');
    }

    await event.destroy();

    logger.info(`Event deleted: ${eventId}`);
  }

  /**
   * Register for event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {Object} customFields - Custom registration fields
   * @returns {Object} - Registration object
   */
  async registerForEvent(eventId, userId, customFields = {}) {
    const transaction = await db.sequelize.transaction();

    try {
      const event = await Event.findByPk(eventId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!event) {
        throw new Error('Etkinlik bulunamadı');
      }

      if (event.status !== 'published') {
        throw new Error('Etkinlik kayıt için açık değil');
      }

      // Check registration deadline
      if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
        throw new Error('Kayıt süresi dolmuş');
      }

      // Check if already registered or waitlisted
      const existingRegistration = await EventRegistration.findOne({
        where: {
          event_id: eventId,
          user_id: userId,
          status: { [Op.in]: ['registered', 'waitlisted'] },
        },
        transaction,
      });

      if (existingRegistration) {
        throw new Error('Bu etkinliğe zaten kayıtlısınız');
      }

      // Check capacity
      if (event.capacity && event.registered_count >= event.capacity) {
        // Add to waitlist
        const qrCode = qrCodeService.generateQRCode('EVENT');
        const registration = await EventRegistration.create(
          {
            event_id: eventId,
            user_id: userId,
            registration_date: new Date(),
            qr_code: qrCode,
            custom_fields_json: customFields,
            checked_in: false,
            status: 'waitlisted',
          },
          { transaction }
        );

        await transaction.commit();

        logger.info(`Event waitlist registration created: ${registration.id}`);

        // Get user and send notification
        const user = await User.findByPk(userId);
        await notificationService.sendEventWaitlistNotification(user, event, registration);

        return { ...registration.toJSON(), isWaitlisted: true };
      }

      // Generate QR code
      const qrCode = qrCodeService.generateQRCode('EVENT');

      // Create registration
      const registration = await EventRegistration.create(
        {
          event_id: eventId,
          user_id: userId,
          registration_date: new Date(),
          qr_code: qrCode,
          custom_fields_json: customFields,
          checked_in: false,
        },
        { transaction }
      );

      // Update registered_count atomically
      await event.update(
        { registered_count: db.sequelize.literal('registered_count + 1') },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Event registration created: ${registration.id}`);

      // Get user and send notification
      const user = await User.findByPk(userId);
      await notificationService.sendEventRegistrationConfirmation(user, event, registration);

      return registration;
    } catch (error) {
      await transaction.rollback();
      logger.error('Register for event error:', error);
      throw error;
    }
  }

  /**
   * Cancel event registration
   * @param {string} eventId - Event ID
   * @param {string} registrationId - Registration ID
   * @param {string} userId - User ID (for verification)
   * @returns {Object} - Cancellation result
   */
  async cancelRegistration(eventId, registrationId, userId) {
    const transaction = await db.sequelize.transaction();

    try {
      const registration = await EventRegistration.findOne({
        where: {
          id: registrationId,
          event_id: eventId,
          user_id: userId,
        },
        transaction,
      });

      if (!registration) {
        throw new Error('Kayıt bulunamadı');
      }

      if (registration.checked_in) {
        throw new Error('Etkinliğe giriş yapılmış, kayıt iptal edilemez');
      }

      const wasRegistered = registration.status === 'registered';

      // Update event registered_count if was registered
      if (wasRegistered) {
        await Event.update(
          { registered_count: db.sequelize.literal('registered_count - 1') },
          {
            where: { id: eventId },
            transaction,
          }
        );
      }

      // Delete registration
      await registration.destroy({ transaction });

      await transaction.commit();

      logger.info(`Event registration cancelled: ${registrationId}`);

      // If was registered and event has capacity, promote next waitlist person
      if (wasRegistered) {
        await this.promoteNextWaitlist(eventId);
      }

      return { success: true, message: 'Kayıt iptal edildi' };
    } catch (error) {
      await transaction.rollback();
      logger.error('Cancel registration error:', error);
      throw error;
    }
  }

  /**
   * Get event registrations (event manager)
   * @param {string} eventId - Event ID
   * @returns {Array} - Array of registrations
   */
  async getEventRegistrations(eventId) {
    const registrations = await EventRegistration.findAll({
      where: { event_id: eventId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
      order: [['registration_date', 'ASC']],
    });

    return registrations;
  }

  /**
   * Get user's event registrations
   * @param {string} userId - User ID
   * @returns {Array} - Array of registrations with event details
   */
  async getUserEventRegistrations(userId) {
    const registrations = await EventRegistration.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'title', 'description', 'date', 'start_time', 'end_time', 'location', 'category'],
        },
      ],
      order: [['registration_date', 'DESC']],
    });

    return registrations;
  }

  /**
   * Get registration by QR code (for scanning)
   * @param {string} qrCode - QR code
   * @returns {Object} - Registration object with event details
   */
  async getRegistrationByQR(qrCode) {
    const registration = await EventRegistration.findOne({
      where: { qr_code: qrCode },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: Event,
          as: 'event',
        },
      ],
    });

    if (!registration) {
      throw new Error('Kayıt bulunamadı');
    }

    return registration;
  }

  /**
   * Check-in to event (QR code validation)
   * @param {string} eventId - Event ID
   * @param {string} registrationId - Registration ID
   * @param {string} qrCode - QR code to validate
   * @returns {Object} - Check-in result
   */
  async checkIn(eventId, registrationId, qrCode) {
    const transaction = await db.sequelize.transaction();

    try {
      const registration = await EventRegistration.findOne({
        where: {
          id: registrationId,
          event_id: eventId,
          qr_code: qrCode,
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
        ],
        transaction,
      });

      if (!registration) {
        throw new Error('Geçersiz QR kod veya kayıt bulunamadı');
      }

      if (registration.checked_in) {
        throw new Error('Bu kayıt zaten giriş yapmış');
      }

      // Check if event date matches today
      const event = await Event.findByPk(eventId, { transaction });
      const today = new Date().toISOString().split('T')[0];
      if (event.date !== today) {
        throw new Error('Bu etkinlik bugün için geçerli değil');
      }

      // Mark as checked in
      await registration.update(
        {
          checked_in: true,
          checked_in_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Event check-in: ${registrationId}`);

      return {
        success: true,
        user: registration.user,
        message: 'Giriş başarılı',
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Check-in error:', error);
      throw error;
    }
  }

  /**
   * Promote next person from waitlist to registered
   * @param {string} eventId - Event ID
   * @returns {Object|null} - Promoted registration or null
   */
  async promoteNextWaitlist(eventId) {
    const transaction = await db.sequelize.transaction();

    try {
      const event = await Event.findByPk(eventId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!event || !event.capacity || event.registered_count >= event.capacity) {
        await transaction.rollback();
        return null;
      }

      // Get first waitlisted registration
      const waitlistRegistration = await EventRegistration.findOne({
        where: {
          event_id: eventId,
          status: 'waitlisted',
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
        ],
        order: [['registration_date', 'ASC']],
        transaction,
      });

      if (!waitlistRegistration) {
        await transaction.rollback();
        return null;
      }

      // Promote to registered
      await waitlistRegistration.update(
        { status: 'registered' },
        { transaction }
      );

      // Update event registered_count
      await event.update(
        { registered_count: db.sequelize.literal('registered_count + 1') },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Waitlist promotion: ${waitlistRegistration.id} for event ${eventId}`);

      // Send notification to promoted user
      await notificationService.sendEventWaitlistPromotionNotification(
        waitlistRegistration.user,
        event,
        waitlistRegistration
      );

      return waitlistRegistration;
    } catch (error) {
      await transaction.rollback();
      logger.error('Promote waitlist error:', error);
      return null;
    }
  }
}

module.exports = new EventService();

