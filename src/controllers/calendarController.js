const db = require('../models');
const { AcademicCalendar } = db;
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get all calendar events
 * GET /api/v1/calendar
 */
const getCalendarEvents = async (req, res) => {
    try {
        const { semester, year, event_type, from, to } = req.query;

        const where = { is_active: true };

        if (semester) where.semester = semester;
        if (year) where.year = parseInt(year);
        if (event_type) where.event_type = event_type;

        if (from || to) {
            where.start_date = {};
            if (from) where.start_date[Op.gte] = from;
            if (to) where.start_date[Op.lte] = to;
        }

        const events = await AcademicCalendar.findAll({
            where,
            order: [['start_date', 'ASC']],
        });

        res.json({
            success: true,
            data: events.map(e => ({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.start_date,
                endDate: e.end_date,
                eventType: e.event_type,
                semester: e.semester,
                year: e.year,
            })),
        });
    } catch (error) {
        logger.error('Get calendar events error:', error);
        res.status(500).json({
            success: false,
            message: 'Takvim etkinlikleri alınırken hata oluştu',
            error: error.message,
        });
    }
};

/**
 * Create calendar event (admin only)
 * POST /api/v1/calendar
 */
const createCalendarEvent = async (req, res) => {
    try {
        const { title, description, start_date, end_date, event_type, semester, year } = req.body;

        const event = await AcademicCalendar.create({
            title,
            description,
            start_date,
            end_date,
            event_type: event_type || 'other',
            semester,
            year,
        });

        logger.info(`Calendar event created: ${event.id} by ${req.user.id}`);

        res.status(201).json({
            success: true,
            message: 'Takvim etkinliği oluşturuldu',
            data: event,
        });
    } catch (error) {
        logger.error('Create calendar event error:', error);
        res.status(500).json({
            success: false,
            message: 'Takvim etkinliği oluşturulurken hata oluştu',
            error: error.message,
        });
    }
};

/**
 * Update calendar event (admin only)
 * PUT /api/v1/calendar/:id
 */
const updateCalendarEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, start_date, end_date, event_type, semester, year, is_active } = req.body;

        const event = await AcademicCalendar.findByPk(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Etkinlik bulunamadı',
            });
        }

        await event.update({
            title: title !== undefined ? title : event.title,
            description: description !== undefined ? description : event.description,
            start_date: start_date !== undefined ? start_date : event.start_date,
            end_date: end_date !== undefined ? end_date : event.end_date,
            event_type: event_type !== undefined ? event_type : event.event_type,
            semester: semester !== undefined ? semester : event.semester,
            year: year !== undefined ? year : event.year,
            is_active: is_active !== undefined ? is_active : event.is_active,
        });

        res.json({
            success: true,
            message: 'Etkinlik güncellendi',
            data: event,
        });
    } catch (error) {
        logger.error('Update calendar event error:', error);
        res.status(500).json({
            success: false,
            message: 'Etkinlik güncellenirken hata oluştu',
            error: error.message,
        });
    }
};

/**
 * Delete calendar event (admin only)
 * DELETE /api/v1/calendar/:id
 */
const deleteCalendarEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await AcademicCalendar.findByPk(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Etkinlik bulunamadı',
            });
        }

        await event.destroy();

        res.json({
            success: true,
            message: 'Etkinlik silindi',
        });
    } catch (error) {
        logger.error('Delete calendar event error:', error);
        res.status(500).json({
            success: false,
            message: 'Etkinlik silinirken hata oluştu',
            error: error.message,
        });
    }
};

module.exports = {
    getCalendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
};
