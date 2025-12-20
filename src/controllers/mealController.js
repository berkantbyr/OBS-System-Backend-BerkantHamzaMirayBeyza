const mealService = require('../services/mealService');
const logger = require('../utils/logger');

/**
 * Get cafeterias
 * GET /api/v1/meals/cafeterias
 */
const getCafeterias = async (req, res) => {
  try {
    const db = require('../models');
    const { Cafeteria } = db;

    const cafeterias = await Cafeteria.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: cafeterias,
    });
  } catch (error) {
    logger.error('Get cafeterias error:', error);
    res.status(500).json({
      success: false,
      message: 'Kafeteryalar alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Seed cafeterias (admin only)
 * POST /api/v1/meals/cafeterias/seed
 */
const seedCafeterias = async (req, res) => {
  try {
    const db = require('../models');
    const { Cafeteria } = db;

    const defaultCafeterias = [
      { name: 'Batı Kampüs', location: 'Batı Kampüs Kafeteryası', capacity: 500, is_active: true },
      { name: 'Doğu Kampüs', location: 'Doğu Kampüs Kafeteryası', capacity: 500, is_active: true },
      { name: 'Kuzey Kampüs', location: 'Kuzey Kampüs Kafeteryası', capacity: 500, is_active: true },
      { name: 'Güney Kampüs', location: 'Güney Kampüs Kafeteryası', capacity: 500, is_active: true },
    ];

    const createdCafeterias = [];
    for (const cafeteriaData of defaultCafeterias) {
      const [cafeteria, created] = await Cafeteria.findOrCreate({
        where: { name: cafeteriaData.name },
        defaults: cafeteriaData,
      });
      if (created) {
        createdCafeterias.push(cafeteria);
      }
    }

    res.json({
      success: true,
      message: `${createdCafeterias.length} kafeterya oluşturuldu`,
      data: createdCafeterias,
    });
  } catch (error) {
    logger.error('Seed cafeterias error:', error);
    res.status(500).json({
      success: false,
      message: 'Kafeteryalar oluşturulurken hata oluştu',
      error: error.message,
    });
  }
};

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

/**
 * Transfer reservation to another student
 * POST /api/v1/meals/reservations/:id/transfer
 */
const transferReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { student_number } = req.body;
    const userId = req.user.id;

    if (!student_number) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci numarası gerekli',
      });
    }

    const result = await mealService.transferReservation(id, userId, student_number);

    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logger.error('Transfer reservation error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Accept transferred reservation
 * POST /api/v1/meals/reservations/:id/accept-transfer
 */
const acceptTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await mealService.acceptTransfer(id, userId);

    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logger.error('Accept transfer error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get pending transfers for current user
 * GET /api/v1/meals/reservations/pending-transfers
 */
const getPendingTransfers = async (req, res) => {
  try {
    const userId = req.user.id;

    const transfers = await mealService.getPendingTransfers(userId);

    res.json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    logger.error('Get pending transfers error:', error);
    res.status(500).json({
      success: false,
      message: 'Bekleyen transferler alınırken hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  getCafeterias,
  seedCafeterias,
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
  transferReservation,
  acceptTransfer,
  getPendingTransfers,
};

