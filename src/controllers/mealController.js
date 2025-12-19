const mealService = require('../services/mealService');
const logger = require('../utils/logger');

/**
 * Get menus
 * GET /api/v1/meals/menus
 */
const getMenus = async (req, res) => {
  try {
    const { date, cafeteria_id, meal_type } = req.query;

    const menus = await mealService.getMenus({
      date,
      cafeteria_id,
      meal_type,
    });

    res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    logger.error('Get menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Menüler alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get menu by ID
 * GET /api/v1/meals/menus/:id
 */
const getMenuById = async (req, res) => {
  try {
    const { id } = req.params;

    const menu = await mealService.getMenuById(id);

    res.json({
      success: true,
      data: menu,
    });
  } catch (error) {
    logger.error('Get menu error:', error);
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create menu (admin/cafeteria staff)
 * POST /api/v1/meals/menus
 */
const createMenu = async (req, res) => {
  try {
    const menuData = req.body;

    const menu = await mealService.createMenu(menuData);

    res.status(201).json({
      success: true,
      message: 'Menü oluşturuldu',
      data: menu,
    });
  } catch (error) {
    logger.error('Create menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Menü oluşturulurken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Update menu
 * PUT /api/v1/meals/menus/:id
 */
const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const menu = await mealService.updateMenu(id, updateData);

    res.json({
      success: true,
      message: 'Menü güncellendi',
      data: menu,
    });
  } catch (error) {
    logger.error('Update menu error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete menu
 * DELETE /api/v1/meals/menus/:id
 */
const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;

    await mealService.deleteMenu(id);

    res.json({
      success: true,
      message: 'Menü silindi',
    });
  } catch (error) {
    logger.error('Delete menu error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create meal reservation
 * POST /api/v1/meals/reservations
 */
const createReservation = async (req, res) => {
  try {
    const reservationData = req.body;
    const userId = req.user.id;

    const reservation = await mealService.createReservation(userId, reservationData);

    res.status(201).json({
      success: true,
      message: 'Yemek rezervasyonu oluşturuldu',
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
 * Cancel reservation
 * DELETE /api/v1/meals/reservations/:id
 */
const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await mealService.cancelReservation(id, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Cancel reservation error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get user's reservations
 * GET /api/v1/meals/reservations/my-reservations
 */
const getMyReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, date_from, date_to } = req.query;

    const reservations = await mealService.getUserReservations(userId, {
      status,
      date_from,
      date_to,
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
 * Get reservation by QR code (for scanning)
 * GET /api/v1/meals/reservations/qr/:qrCode
 */
const getReservationByQR = async (req, res) => {
  try {
    const { qrCode } = req.params;

    const reservation = await mealService.getReservationByQR(qrCode);

    res.json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    logger.error('Get reservation by QR error:', error);
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Use reservation (cafeteria staff)
 * POST /api/v1/meals/reservations/:id/use
 */
const useReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        message: 'QR kod gerekli',
      });
    }

    const result = await mealService.useReservation(id, qr_code);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Use reservation error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  createReservation,
  cancelReservation,
  getMyReservations,
  getReservationByQR,
  useReservation,
};

