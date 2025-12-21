const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const { Classroom } = db;

/**
 * Classroom Routes
 * Base path: /api/v1/classrooms
 */

// Get all classrooms
router.get('/', authenticate, async (req, res) => {
  try {
    const { building, has_gps } = req.query;
    const where = { is_active: true };

    if (building) {
      where.building = building;
    }

    const classrooms = await Classroom.findAll({
      where,
      order: [['building', 'ASC'], ['room_number', 'ASC']],
    });

    // Filter by GPS availability if requested
    let result = classrooms;
    if (has_gps === 'true') {
      result = classrooms.filter((c) => c.latitude && c.longitude);
    }

    res.json({
      success: true,
      data: result.map((c) => ({
        id: c.id,
        building: c.building,
        roomNumber: c.room_number,
        capacity: c.capacity,
        floor: c.floor,
        hasGPS: !!(c.latitude && c.longitude),
        location: c.latitude && c.longitude ? {
          latitude: c.latitude,
          longitude: c.longitude,
        } : null,
        features: c.features_json,
      })),
    });
  } catch (error) {
    logger.error('Get classrooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Derslikler alınırken hata oluştu',
      error: error.message,
    });
  }
});

// Get classroom by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Derslik bulunamadı',
      });
    }

    res.json({
      success: true,
      data: {
        id: classroom.id,
        building: classroom.building,
        roomNumber: classroom.room_number,
        capacity: classroom.capacity,
        floor: classroom.floor,
        location: classroom.latitude && classroom.longitude ? {
          latitude: classroom.latitude,
          longitude: classroom.longitude,
        } : null,
        features: classroom.features_json,
        isActive: classroom.is_active,
      },
    });
  } catch (error) {
    logger.error('Get classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Derslik detayları alınırken hata oluştu',
      error: error.message,
    });
  }
});

// Create classroom (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { building, room_number, capacity, floor, latitude, longitude, features_json } = req.body;

    // Check for duplicate
    const existing = await Classroom.findOne({
      where: { building, room_number },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bu derslik zaten mevcut',
      });
    }

    const classroom = await Classroom.create({
      building,
      room_number,
      capacity: capacity || 30,
      floor,
      latitude,
      longitude,
      features_json,
      is_active: true,
    });

    logger.info(`Classroom created: ${building} ${room_number} by admin ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Derslik başarıyla oluşturuldu',
      data: classroom,
    });
  } catch (error) {
    logger.error('Create classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Derslik oluşturulurken hata oluştu',
      error: error.message,
    });
  }
});

// Update classroom (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Derslik bulunamadı',
      });
    }

    const { building, room_number, capacity, floor, latitude, longitude, features_json, is_active } = req.body;

    await classroom.update({
      building: building || classroom.building,
      room_number: room_number || classroom.room_number,
      capacity: capacity || classroom.capacity,
      floor: floor !== undefined ? floor : classroom.floor,
      latitude: latitude !== undefined ? latitude : classroom.latitude,
      longitude: longitude !== undefined ? longitude : classroom.longitude,
      features_json: features_json !== undefined ? features_json : classroom.features_json,
      is_active: is_active !== undefined ? is_active : classroom.is_active,
    });

    logger.info(`Classroom updated: ${classroom.building} ${classroom.room_number} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Derslik başarıyla güncellendi',
      data: classroom,
    });
  } catch (error) {
    logger.error('Update classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Derslik güncellenirken hata oluştu',
      error: error.message,
    });
  }
});

// Delete classroom (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Derslik bulunamadı',
      });
    }

    // Soft delete
    classroom.is_active = false;
    await classroom.save();

    logger.info(`Classroom deleted: ${classroom.building} ${classroom.room_number} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Derslik başarıyla silindi',
    });
  } catch (error) {
    logger.error('Delete classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Derslik silinirken hata oluştu',
      error: error.message,
    });
  }
});

module.exports = router;





