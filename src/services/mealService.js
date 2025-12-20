const db = require('../models');
const { MealMenu, MealReservation, Cafeteria, User, Student } = db;
const qrCodeService = require('./qrCodeService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * MealService - Handles meal menu and reservation logic
 */
class MealService {
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
    try {
      logger.info('createMenu called with data:', JSON.stringify(menuData, null, 2));

      // Validate required fields
      if (!menuData.cafeteria_id || menuData.cafeteria_id.trim() === '') {
        throw new Error('Kafeterya seçilmelidir');
      }

      if (!menuData.date || menuData.date.trim() === '') {
        throw new Error('Tarih seçilmelidir');
      }

      if (!menuData.meal_type || menuData.meal_type.trim() === '') {
        throw new Error('Öğün tipi seçilmelidir');
      }

      // Validate cafeteria exists
      let cafeteria = await Cafeteria.findByPk(menuData.cafeteria_id);
      if (!cafeteria) {
        // If cafeteria doesn't exist, try to seed default cafeterias
        logger.warn(`Cafeteria ${menuData.cafeteria_id} not found, attempting to seed default cafeterias`);
        
        const defaultCafeterias = [
          { name: 'Batı Kampüs', location: 'Batı Kampüs Kafeteryası', capacity: 500, is_active: true },
          { name: 'Doğu Kampüs', location: 'Doğu Kampüs Kafeteryası', capacity: 500, is_active: true },
          { name: 'Kuzey Kampüs', location: 'Kuzey Kampüs Kafeteryası', capacity: 500, is_active: true },
          { name: 'Güney Kampüs', location: 'Güney Kampüs Kafeteryası', capacity: 500, is_active: true },
        ];

        for (const cafeteriaData of defaultCafeterias) {
          try {
            await Cafeteria.findOrCreate({
              where: { name: cafeteriaData.name },
              defaults: cafeteriaData,
            });
          } catch (seedError) {
            logger.error('Error seeding cafeteria:', cafeteriaData.name, seedError);
          }
        }

        // Try to find the cafeteria again
        cafeteria = await Cafeteria.findByPk(menuData.cafeteria_id);
        if (!cafeteria) {
          // If still not found, list all available cafeterias
          const allCafeterias = await Cafeteria.findAll({ where: { is_active: true } });
          logger.error(`Cafeteria ${menuData.cafeteria_id} not found. Available cafeterias:`, 
            allCafeterias.map(c => ({ id: c.id, name: c.name })));
          throw new Error(`Geçersiz kafeterya ID: ${menuData.cafeteria_id}. Lütfen geçerli bir kafeterya seçin.`);
        }
      }

      logger.info('Cafeteria found:', { id: cafeteria.id, name: cafeteria.name });

      // Clean nutrition_json - remove empty strings and convert to numbers where appropriate
      let nutritionJson = menuData.nutrition_json || {};
      if (typeof nutritionJson === 'object' && nutritionJson !== null) {
        const cleanedNutrition = {};
        if (nutritionJson.calories !== undefined && nutritionJson.calories !== null && nutritionJson.calories !== '') {
          const calories = parseFloat(nutritionJson.calories);
          if (!isNaN(calories)) {
            cleanedNutrition.calories = calories;
          }
        }
        if (nutritionJson.protein !== undefined && nutritionJson.protein !== null && nutritionJson.protein !== '') {
          const protein = parseFloat(nutritionJson.protein);
          if (!isNaN(protein)) {
            cleanedNutrition.protein = protein;
          }
        }
        if (nutritionJson.carbs !== undefined && nutritionJson.carbs !== null && nutritionJson.carbs !== '') {
          const carbs = parseFloat(nutritionJson.carbs);
          if (!isNaN(carbs)) {
            cleanedNutrition.carbs = carbs;
          }
        }
        if (nutritionJson.fat !== undefined && nutritionJson.fat !== null && nutritionJson.fat !== '') {
          const fat = parseFloat(nutritionJson.fat);
          if (!isNaN(fat)) {
            cleanedNutrition.fat = fat;
          }
        }
        nutritionJson = Object.keys(cleanedNutrition).length > 0 ? cleanedNutrition : null;
      } else {
        nutritionJson = null;
      }

      // Ensure items_json is an array
      const itemsJson = Array.isArray(menuData.items_json) ? menuData.items_json : [];

      // Parse price
      let price = 0;
      if (menuData.price !== undefined && menuData.price !== null && menuData.price !== '') {
        const parsedPrice = parseFloat(menuData.price);
        price = isNaN(parsedPrice) ? 0 : parsedPrice;
      }

      logger.info('Creating menu with cleaned data:', {
        cafeteria_id: menuData.cafeteria_id,
        date: menuData.date,
        meal_type: menuData.meal_type,
        items_count: itemsJson.length,
        has_nutrition: nutritionJson !== null,
        price: price,
        is_published: menuData.is_published || false,
      });

      const menu = await MealMenu.create({
        cafeteria_id: menuData.cafeteria_id,
        date: menuData.date,
        meal_type: menuData.meal_type,
        items_json: itemsJson,
        nutrition_json: nutritionJson,
        price: price,
        is_published: menuData.is_published !== undefined ? menuData.is_published : false,
      });

      logger.info(`Menu created successfully: ${menu.id}`);

      return menu;
    } catch (error) {
      logger.error('Error in createMenu:', error);
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        menuData: JSON.stringify(menuData, null, 2),
      });
      throw error;
    }
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

      // Get user
      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      logger.info(`Creating reservation - User: ${userId}, Date: ${date}, Meal: ${meal_type}`);

      // All reservations are free - no wallet checks needed

      // Generate QR code
      const qrCode = qrCodeService.generateQRCode('MEAL');

      // Create reservation (all reservations are free)
      const reservation = await MealReservation.create(
        {
          user_id: userId,
          menu_id: menu_id,
          cafeteria_id: cafeteria_id,
          meal_type: meal_type,
          date: date,
          amount: 0, // All reservations are free
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

      // Update reservation status (no refund needed as all reservations are free)
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

      // Mark as used (no wallet deduction needed as all reservations are free)
      await reservation.update(
        {
          status: 'used',
          used_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Reservation used: ${reservationId}`);

      return { success: true, message: 'Yemek kullanıldı' };
    } catch (error) {
      await transaction.rollback();
      logger.error('Use reservation error:', error);
      throw error;
    }
  }

  /**
   * Transfer meal reservation to another student
   * @param {string} reservationId - Reservation ID
   * @param {string} fromUserId - Current user ID
   * @param {string} studentNumber - Student number to transfer to
   * @returns {Object} - Transfer result
   */
  async transferReservation(reservationId, fromUserId, studentNumber) {
    const transaction = await db.sequelize.transaction();

    try {
      // Get reservation
      const reservation = await MealReservation.findOne({
        where: {
          id: reservationId,
          user_id: fromUserId,
          status: 'reserved',
        },
        include: [
          {
            model: MealMenu,
            as: 'menu',
          },
        ],
        transaction,
      });

      if (!reservation) {
        throw new Error('Rezervasyon bulunamadı veya devredilemez durumda');
      }

      // Check if reservation date is today or future
      const today = new Date().toISOString().split('T')[0];
      if (reservation.date < today) {
        throw new Error('Geçmiş tarihli rezervasyonlar devredilemez');
      }

      // Find student by student number
      const targetStudent = await Student.findOne({
        where: { student_number: studentNumber },
        include: [{ model: User, as: 'user' }],
        transaction,
      });

      if (!targetStudent) {
        throw new Error('Öğrenci numarası bulunamadı');
      }

      const targetUserId = targetStudent.user_id;

      // Check if trying to transfer to self
      if (targetUserId === fromUserId) {
        throw new Error('Rezervasyonu kendinize devredemezsiniz');
      }

      // Check if target student already has reservation for same meal
      const existingReservation = await MealReservation.findOne({
        where: {
          user_id: targetUserId,
          date: reservation.date,
          meal_type: reservation.meal_type,
          status: { [Op.in]: ['reserved', 'used'] },
        },
        transaction,
      });

      if (existingReservation) {
        throw new Error('Alıcı öğrencinin bu öğün için zaten rezervasyonu var');
      }

      // Update reservation with transfer info
      await reservation.update(
        {
          transferred_to_user_id: targetUserId,
          transferred_from_user_id: fromUserId,
          transfer_status: 'pending',
          transfer_student_number: studentNumber,
          transferred_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Reservation transfer initiated: ${reservationId} to ${targetUserId}`);

      // Send notification to target student
      await notificationService.sendMealTransferNotification(
        targetStudent.user,
        reservation,
        fromUserId
      );

      return {
        success: true,
        message: 'Rezervasyon devri başlatıldı. Alıcı öğrenci onay bekliyor.',
        data: reservation,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Transfer reservation error:', error);
      throw error;
    }
  }

  /**
   * Accept transferred meal reservation
   * @param {string} reservationId - Reservation ID
   * @param {string} toUserId - User ID accepting the transfer
   * @returns {Object} - Acceptance result
   */
  async acceptTransfer(reservationId, toUserId) {
    const transaction = await db.sequelize.transaction();

    try {
      // Get reservation
      const reservation = await MealReservation.findOne({
        where: {
          id: reservationId,
          transferred_to_user_id: toUserId,
          transfer_status: 'pending',
          status: 'reserved',
        },
        include: [
          {
            model: MealMenu,
            as: 'menu',
          },
          {
            model: User,
            as: 'user',
            include: [{ model: Student, as: 'student' }],
          },
        ],
        transaction,
      });

      if (!reservation) {
        throw new Error('Bekleyen transfer bulunamadı');
      }

      // Check if reservation date is still valid
      const today = new Date().toISOString().split('T')[0];
      if (reservation.date < today) {
        throw new Error('Bu rezervasyonun tarihi geçmiş');
      }

      // Check if target student already has reservation for same meal
      const existingReservation = await MealReservation.findOne({
        where: {
          user_id: toUserId,
          date: reservation.date,
          meal_type: reservation.meal_type,
          status: { [Op.in]: ['reserved', 'used'] },
          id: { [Op.ne]: reservationId },
        },
        transaction,
      });

      if (existingReservation) {
        throw new Error('Bu öğün için zaten rezervasyonunuz var');
      }

      // Get target user and check if scholarship
      const targetUser = await User.findByPk(toUserId, {
        include: [{ model: Student, as: 'student' }],
        transaction,
      });

      // Transfer reservation to new user (all reservations are free)
      await reservation.update(
        {
          user_id: toUserId,
          transfer_status: 'accepted',
          amount: 0, // All reservations are free
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Reservation transfer accepted: ${reservationId} by ${toUserId}`);

      // Send notification to original user
      await notificationService.sendMealTransferAcceptedNotification(
        reservation.user,
        reservation,
        targetUser
      );

      return {
        success: true,
        message: 'Rezervasyon devri kabul edildi',
        data: reservation,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Accept transfer error:', error);
      throw error;
    }
  }

  /**
   * Get pending transfers for a user
   * @param {string} userId - User ID
   * @returns {Array} - Array of pending transfers
   */
  async getPendingTransfers(userId) {
    const transfers = await MealReservation.findAll({
      where: {
        transferred_to_user_id: userId,
        transfer_status: 'pending',
        status: 'reserved',
      },
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
          include: [{ model: Student, as: 'student', attributes: ['student_number'] }],
        },
        {
          model: Cafeteria,
          as: 'cafeteria',
          attributes: ['id', 'name', 'location'],
        },
      ],
      order: [['transferred_at', 'DESC']],
    });

    return transfers;
  }
}

module.exports = new MealService();

