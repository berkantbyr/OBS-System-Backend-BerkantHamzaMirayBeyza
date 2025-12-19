const db = require('../models');
const { MealMenu, MealReservation, Cafeteria, User, Student } = db;
const qrCodeService = require('./qrCodeService');
const notificationService = require('./notificationService');
const walletService = require('./walletService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * MealService - Handles meal menu and reservation logic
 */
class MealService {
  /**
   * Daily meal quota for scholarship students
   */
  DAILY_MEAL_QUOTA = 2;

  /**
   * Minimum hours before meal time to cancel reservation
   */
  MIN_CANCEL_HOURS = 2;

  /**
   * Get menus with date filter
   * @param {Object} filters - { date, cafeteria_id, meal_type }
   * @returns {Array} - Array of menus
   */
  async getMenus(filters = {}) {
    const where = { is_published: true };

    if (filters.date) {
      where.date = filters.date;
    }

    if (filters.cafeteria_id) {
      where.cafeteria_id = filters.cafeteria_id;
    }

    if (filters.meal_type) {
      where.meal_type = filters.meal_type;
    }

    const menus = await MealMenu.findAll({
      where,
      include: [
        {
          model: Cafeteria,
          as: 'cafeteria',
          attributes: ['id', 'name', 'location'],
        },
      ],
      order: [['date', 'ASC'], ['meal_type', 'ASC']],
    });

    return menus;
  }

  /**
   * Get menu by ID
   * @param {string} menuId - Menu ID
   * @returns {Object} - Menu object
   */
  async getMenuById(menuId) {
    const menu = await MealMenu.findByPk(menuId, {
      include: [
        {
          model: Cafeteria,
          as: 'cafeteria',
          attributes: ['id', 'name', 'location'],
        },
      ],
    });

    if (!menu) {
      throw new Error('Menü bulunamadı');
    }

    return menu;
  }

  /**
   * Create menu (admin/cafeteria staff)
   * @param {Object} menuData - Menu data
   * @returns {Object} - Created menu
   */
  async createMenu(menuData) {
    const menu = await MealMenu.create({
      cafeteria_id: menuData.cafeteria_id,
      date: menuData.date,
      meal_type: menuData.meal_type,
      items_json: menuData.items_json || [],
      nutrition_json: menuData.nutrition_json || {},
      is_published: menuData.is_published !== undefined ? menuData.is_published : false,
    });

    logger.info(`Menu created: ${menu.id}`);

    return menu;
  }

  /**
   * Update menu
   * @param {string} menuId - Menu ID
   * @param {Object} updateData - Update data
   * @returns {Object} - Updated menu
   */
  async updateMenu(menuId, updateData) {
    const menu = await MealMenu.findByPk(menuId);

    if (!menu) {
      throw new Error('Menü bulunamadı');
    }

    await menu.update(updateData);

    logger.info(`Menu updated: ${menuId}`);

    return menu;
  }

  /**
   * Delete menu
   * @param {string} menuId - Menu ID
   */
  async deleteMenu(menuId) {
    const menu = await MealMenu.findByPk(menuId);

    if (!menu) {
      throw new Error('Menü bulunamadı');
    }

    await menu.destroy();

    logger.info(`Menu deleted: ${menuId}`);
  }

  /**
   * Create meal reservation
   * @param {string} userId - User ID
   * @param {Object} reservationData - { menu_id, cafeteria_id, meal_type, date }
   * @returns {Object} - Created reservation
   */
  async createReservation(userId, reservationData) {
    const transaction = await db.sequelize.transaction();

    try {
      const { menu_id, cafeteria_id, meal_type, date } = reservationData;

      // Get menu
      const menu = await MealMenu.findByPk(menu_id, { transaction });
      if (!menu || !menu.is_published) {
        throw new Error('Menü bulunamadı veya yayınlanmamış');
      }

      // Get user and check if student
      const user = await User.findByPk(userId, {
        include: [{ model: Student, as: 'student' }],
        transaction,
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      const isScholarship = user.student?.has_scholarship || false;

      logger.info(`Creating reservation - User: ${userId}, Scholarship: ${isScholarship}, Date: ${date}, Meal: ${meal_type}`);

      // Check daily quota for scholarship students
      if (isScholarship) {
        const todayReservations = await MealReservation.count({
          where: {
            user_id: userId,
            date: date,
            status: { [Op.in]: ['reserved', 'used'] },
          },
          transaction,
        });

        if (todayReservations >= this.DAILY_MEAL_QUOTA) {
          throw new Error(`Günlük yemek kotanız doldu (Maksimum ${this.DAILY_MEAL_QUOTA} öğün/gün)`);
        }
      } else {
        // Check wallet balance for paid students
        const wallet = await walletService.getWalletByUserId(userId, transaction);
        const mealPrice = menu.price || 0; // Assume menu has price field or get from cafeteria

        if (wallet.balance < mealPrice) {
          throw new Error(`Yetersiz bakiye. Gerekli: ${mealPrice} TRY, Mevcut: ${wallet.balance} TRY`);
        }

        // Create pending transaction (will deduct on use)
        await walletService.createPendingTransaction(
          wallet.id,
          mealPrice,
          'meal_reservation',
          menu_id,
          `Yemek rezervasyonu - ${meal_type}`,
          transaction
        );
      }

      // Generate QR code
      const qrCode = qrCodeService.generateQRCode('MEAL');

      // Create reservation
      const reservation = await MealReservation.create(
        {
          user_id: userId,
          menu_id: menu_id,
          cafeteria_id: cafeteria_id,
          meal_type: meal_type,
          date: date,
          amount: isScholarship ? 0 : (menu.price || 0),
          qr_code: qrCode,
          status: 'reserved',
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Reservation created: ${reservation.id}`);

      // Send notification
      await notificationService.sendMealReservationConfirmation(user, reservation, menu);

      return reservation;
    } catch (error) {
      await transaction.rollback();
      logger.error('Create reservation error:', error);
      throw error;
    }
  }

  /**
   * Cancel reservation
   * @param {string} reservationId - Reservation ID
   * @param {string} userId - User ID (for verification)
   * @returns {Object} - Cancellation result
   */
  async cancelReservation(reservationId, userId) {
    const transaction = await db.sequelize.transaction();

    try {
      const reservation = await MealReservation.findOne({
        where: {
          id: reservationId,
          user_id: userId,
          status: 'reserved',
        },
        include: [{ model: MealMenu, as: 'menu' }],
        transaction,
      });

      if (!reservation) {
        throw new Error('Rezervasyon bulunamadı veya iptal edilemez durumda');
      }

      // Check if >= 2 hours before meal time
      const mealDateTime = new Date(`${reservation.date}T${reservation.menu?.meal_time || '12:00'}`);
      const hoursUntilMeal = (mealDateTime - new Date()) / (1000 * 60 * 60);

      if (hoursUntilMeal < this.MIN_CANCEL_HOURS) {
        throw new Error(`Rezervasyonu iptal etmek için en az ${this.MIN_CANCEL_HOURS} saat önceden iptal etmeniz gerekir`);
      }

      // If paid, refund to wallet
      if (reservation.amount > 0) {
        await walletService.refundTransaction(
          reservation.user_id,
          reservation.amount,
          'meal_reservation_cancel',
          reservationId,
          `Yemek rezervasyonu iptali - ${reservation.id}`,
          transaction
        );
      }

      // Update reservation status
      await reservation.update({ status: 'cancelled' }, { transaction });

      await transaction.commit();

      logger.info(`Reservation cancelled: ${reservationId}`);

      return { success: true, message: 'Rezervasyon iptal edildi' };
    } catch (error) {
      await transaction.rollback();
      logger.error('Cancel reservation error:', error);
      throw error;
    }
  }

  /**
   * Get user's reservations
   * @param {string} userId - User ID
   * @param {Object} filters - { status, date_from, date_to }
   * @returns {Array} - Array of reservations
   */
  async getUserReservations(userId, filters = {}) {
    const where = { user_id: userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.date_from || filters.date_to) {
      where.date = {};
      if (filters.date_from) where.date[Op.gte] = filters.date_from;
      if (filters.date_to) where.date[Op.lte] = filters.date_to;
    }

    const reservations = await MealReservation.findAll({
      where,
      include: [
        {
          model: MealMenu,
          as: 'menu',
          include: [{ model: Cafeteria, as: 'cafeteria' }],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: Cafeteria,
          as: 'cafeteria',
          attributes: ['id', 'name', 'location'],
        },
      ],
      order: [['date', 'DESC'], ['meal_type', 'ASC']],
    });

    return reservations;
  }

  /**
   * Get reservation by QR code (for scanning)
   * @param {string} qrCode - QR code
   * @returns {Object} - Reservation object
   */
  async getReservationByQR(qrCode) {
    const reservation = await MealReservation.findOne({
      where: { qr_code: qrCode },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: MealMenu,
          as: 'menu',
          include: [{ model: Cafeteria, as: 'cafeteria' }],
        },
        {
          model: Cafeteria,
          as: 'cafeteria',
          attributes: ['id', 'name', 'location'],
        },
      ],
    });

    if (!reservation) {
      throw new Error('Rezervasyon bulunamadı');
    }

    return reservation;
  }

  /**
   * Use meal reservation (cafeteria staff)
   * @param {string} reservationId - Reservation ID
   * @param {string} qrCode - QR code to validate
   * @returns {Object} - Usage result
   */
  async useReservation(reservationId, qrCode) {
    const transaction = await db.sequelize.transaction();

    try {
      const reservation = await MealReservation.findOne({
        where: {
          id: reservationId,
          qr_code: qrCode,
          status: 'reserved',
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
          {
            model: MealMenu,
            as: 'menu',
          },
          {
            model: Cafeteria,
            as: 'cafeteria',
            attributes: ['id', 'name', 'location'],
          },
        ],
        transaction,
      });

      if (!reservation) {
        throw new Error('Geçersiz QR kod veya rezervasyon bulunamadı');
      }

      // Check if today's date matches
      const today = new Date().toISOString().split('T')[0];
      if (reservation.date !== today) {
        throw new Error('Bu rezervasyon bugün için geçerli değil');
      }

      // Check if already used
      if (reservation.used_at) {
        throw new Error('Bu rezervasyon zaten kullanılmış');
      }

      // Mark as used
      await reservation.update(
        {
          status: 'used',
          used_at: new Date(),
        },
        { transaction }
      );

      // If paid, complete transaction (deduct from wallet)
      if (reservation.amount > 0) {
        await walletService.completePendingTransaction(
          reservation.user_id,
          reservation.amount,
          'meal_reservation',
          reservation.menu_id,
          transaction
        );
      }

      await transaction.commit();

      logger.info(`Reservation used: ${reservationId}`);

      return { success: true, message: 'Yemek kullanıldı' };
    } catch (error) {
      await transaction.rollback();
      logger.error('Use reservation error:', error);
      throw error;
    }
  }
}

module.exports = new MealService();

