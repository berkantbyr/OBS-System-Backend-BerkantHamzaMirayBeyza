const db = require('../models');
const { Reservation, Classroom, User } = db;
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * ReservationService - Handles classroom reservations
 */
class ReservationService {
  /**
   * Create classroom reservation
   * @param {string} userId - User ID
   * @param {Object} reservationData - Reservation data
   * @returns {Object} - Created reservation
   */
  async createReservation(userId, reservationData) {
    const transaction = await db.sequelize.transaction();

    try {
      const { classroom_id, date, start_time, end_time, purpose } = reservationData;

      // Check classroom availability
      const conflicts = await Reservation.findAll({
        where: {
          classroom_id,
          date,
          status: { [Op.in]: ['pending', 'approved'] },
          [Op.or]: [
            {
              start_time: { [Op.between]: [start_time, end_time] },
            },
            {
              end_time: { [Op.between]: [start_time, end_time] },
            },
            {
              [Op.and]: [
                { start_time: { [Op.lte]: start_time } },
                { end_time: { [Op.gte]: end_time } },
              ],
            },
          ],
        },
        transaction,
      });

      if (conflicts.length > 0) {
        throw new Error('Bu saatlerde derslik dolu');
      }

      // Check user permissions (students may need approval)
      const user = await User.findByPk(userId, { transaction });
      const needsApproval = user.role !== 'admin' && user.role !== 'faculty';

      // Create reservation
      const reservation = await Reservation.create(
        {
          classroom_id,
          user_id: userId,
          date,
          start_time,
          end_time,
          purpose: purpose || 'Ders',
          status: needsApproval ? 'pending' : 'approved',
          approved_by: needsApproval ? null : userId,
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Reservation created: ${reservation.id}, Status: ${reservation.status}`);

      // Notify admin if needs approval
      if (needsApproval) {
        // TODO: Send notification to admin
        logger.info(`Reservation ${reservation.id} requires admin approval`);
      }

      return reservation;
    } catch (error) {
      await transaction.rollback();
      logger.error('Create reservation error:', error);
      throw error;
    }
  }

  /**
   * Get reservations with filters
   * @param {Object} filters - { date, classroom_id, user_id }
   * @returns {Array} - Array of reservations
   */
  async getReservations(filters = {}) {
    const where = {};

    if (filters.date) {
      where.date = filters.date;
    }

    if (filters.classroom_id) {
      where.classroom_id = filters.classroom_id;
    }

    if (filters.user_id) {
      where.user_id = filters.user_id;
    }

    const reservations = await Reservation.findAll({
      where,
      include: [
        {
          model: Classroom,
          as: 'classroom',
          attributes: ['id', 'building', 'room_number'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']],
    });

    return reservations;
  }

  /**
   * Approve reservation (admin)
   * @param {string} reservationId - Reservation ID
   * @param {string} adminId - Admin ID
   * @returns {Object} - Approval result
   */
  async approveReservation(reservationId, adminId) {
    const reservation = await Reservation.findByPk(reservationId);

    if (!reservation) {
      throw new Error('Rezervasyon bulunamadı');
    }

    if (reservation.status !== 'pending') {
      throw new Error('Rezervasyon onay bekliyor durumunda değil');
    }

    await reservation.update({
      status: 'approved',
      approved_by: adminId,
    });

    logger.info(`Reservation approved: ${reservationId}`);

    // TODO: Send notification to user

    return {
      success: true,
      message: 'Rezervasyon onaylandı',
      reservation,
    };
  }

  /**
   * Reject reservation (admin)
   * @param {string} reservationId - Reservation ID
   * @param {string} adminId - Admin ID
   * @param {string} reason - Rejection reason
   * @returns {Object} - Rejection result
   */
  async rejectReservation(reservationId, adminId, reason = '') {
    const reservation = await Reservation.findByPk(reservationId);

    if (!reservation) {
      throw new Error('Rezervasyon bulunamadı');
    }

    if (reservation.status !== 'pending') {
      throw new Error('Rezervasyon reddedilemez durumda');
    }

    await reservation.update({
      status: 'rejected',
      approved_by: adminId,
    });

    logger.info(`Reservation rejected: ${reservationId}`);

    // TODO: Send notification to user

    return {
      success: true,
      message: 'Rezervasyon reddedildi',
    };
  }
}

module.exports = new ReservationService();

