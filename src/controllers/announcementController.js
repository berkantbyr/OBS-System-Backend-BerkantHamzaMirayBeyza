const db = require('../models');
const { Announcement } = db;
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get all announcements (with filtering)
 * GET /api/v1/announcements
 */
const getAnnouncements = async (req, res) => {
    try {
        const { type, limit = 20 } = req.query;

        // Determine target audience based on user role
        const userRole = req.user?.role || 'student';
        const targetAudiences = ['all'];
        if (userRole === 'student') targetAudiences.push('students');
        if (userRole === 'faculty') targetAudiences.push('faculty');
        if (userRole === 'admin') targetAudiences.push('admin', 'students', 'faculty');

        const where = {
            is_active: true,
            target_audience: { [Op.in]: targetAudiences },
            [Op.or]: [
                { expires_at: null },
                { expires_at: { [Op.gt]: new Date() } },
            ],
        };

        if (type) {
            where.type = type;
        }

        const announcements = await Announcement.findAll({
            where,
            include: [
                {
                    model: db.User,
                    as: 'author',
                    attributes: ['id', 'first_name', 'last_name'],
                },
            ],
            order: [['priority', 'DESC'], ['created_at', 'DESC']],
            limit: parseInt(limit),
        });

        res.json({
            success: true,
            data: announcements.map(a => ({
                id: a.id,
                title: a.title,
                content: a.content,
                type: a.type,
                author: a.author ? `${a.author.first_name} ${a.author.last_name}` : 'Sistem',
                date: a.created_at,
                priority: a.priority,
            })),
        });
    } catch (error) {
        logger.error('Get announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Duyurular alınırken hata oluştu',
            error: error.message,
        });
    }
};

/**
 * Create announcement (admin only)
 * POST /api/v1/announcements
 */
const createAnnouncement = async (req, res) => {
    try {
        const { title, content, type, target_audience, expires_at, priority } = req.body;

        const announcement = await Announcement.create({
            title,
            content,
            type: type || 'info',
            target_audience: target_audience || 'all',
            author_id: req.user.id,
            expires_at,
            priority: priority || 0,
        });

        logger.info(`Announcement created: ${announcement.id} by ${req.user.id}`);

        res.status(201).json({
            success: true,
            message: 'Duyuru oluşturuldu',
            data: announcement,
        });
    } catch (error) {
        logger.error('Create announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Duyuru oluşturulurken hata oluştu',
            error: error.message,
        });
    }
};

/**
 * Update announcement (admin only)
 * PUT /api/v1/announcements/:id
 */
const updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, type, target_audience, is_active, expires_at, priority } = req.body;

        const announcement = await Announcement.findByPk(id);
        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Duyuru bulunamadı',
            });
        }

        await announcement.update({
            title: title !== undefined ? title : announcement.title,
            content: content !== undefined ? content : announcement.content,
            type: type !== undefined ? type : announcement.type,
            target_audience: target_audience !== undefined ? target_audience : announcement.target_audience,
            is_active: is_active !== undefined ? is_active : announcement.is_active,
            expires_at: expires_at !== undefined ? expires_at : announcement.expires_at,
            priority: priority !== undefined ? priority : announcement.priority,
        });

        res.json({
            success: true,
            message: 'Duyuru güncellendi',
            data: announcement,
        });
    } catch (error) {
        logger.error('Update announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Duyuru güncellenirken hata oluştu',
            error: error.message,
        });
    }
};

/**
 * Delete announcement (admin only)
 * DELETE /api/v1/announcements/:id
 */
const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;

        const announcement = await Announcement.findByPk(id);
        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Duyuru bulunamadı',
            });
        }

        await announcement.destroy();

        res.json({
            success: true,
            message: 'Duyuru silindi',
        });
    } catch (error) {
        logger.error('Delete announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Duyuru silinirken hata oluştu',
            error: error.message,
        });
    }
};

module.exports = {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
};
