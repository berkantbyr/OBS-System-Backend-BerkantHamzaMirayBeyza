const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const { Notification, NotificationPreference, User } = db;

/**
 * Get User Notifications
 * GET /api/v1/notifications
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            page = 1,
            limit = 20,
            category,
            read,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = { user_id: userId };

        if (category) {
            where.category = category;
        }

        if (read !== undefined) {
            where.read = read === 'true';
        }

        const { count, rows: notifications } = await Notification.findAndCountAll({
            where,
            order: [[sort, order.toUpperCase()]],
            limit: parseInt(limit),
            offset
        });

        // Get unread count
        const unreadCount = await Notification.count({
            where: { user_id: userId, read: false }
        });

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / parseInt(limit))
                }
            }
        });

    } catch (error) {
        logger.error('Error getting notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler alınamadı',
            error: error.message
        });
    }
};

/**
 * Get Recent Notifications (for bell dropdown)
 * GET /api/v1/notifications/recent
 */
const getRecentNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 5 } = req.query;

        const notifications = await Notification.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: parseInt(limit)
        });

        const unreadCount = await Notification.count({
            where: { user_id: userId, read: false }
        });

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount
            }
        });

    } catch (error) {
        logger.error('Error getting recent notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Son bildirimler alınamadı',
            error: error.message
        });
    }
};

/**
 * Mark Notification as Read
 * PUT /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await Notification.findOne({
            where: { id, user_id: userId }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Bildirim bulunamadı'
            });
        }

        await notification.update({
            read: true,
            read_at: new Date()
        });

        res.json({
            success: true,
            message: 'Bildirim okundu olarak işaretlendi',
            data: notification
        });

    } catch (error) {
        logger.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim işaretlenemedi',
            error: error.message
        });
    }
};

/**
 * Mark All Notifications as Read
 * PUT /api/v1/notifications/mark-all-read
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const [updatedCount] = await Notification.update(
            { read: true, read_at: new Date() },
            { where: { user_id: userId, read: false } }
        );

        res.json({
            success: true,
            message: `${updatedCount} bildirim okundu olarak işaretlendi`
        });

    } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler işaretlenemedi',
            error: error.message
        });
    }
};

/**
 * Delete Notification
 * DELETE /api/v1/notifications/:id
 */
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await Notification.findOne({
            where: { id, user_id: userId }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Bildirim bulunamadı'
            });
        }

        await notification.destroy();

        res.json({
            success: true,
            message: 'Bildirim silindi'
        });

    } catch (error) {
        logger.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim silinemedi',
            error: error.message
        });
    }
};

/**
 * Get Notification Preferences
 * GET /api/v1/notifications/preferences
 */
const getPreferences = async (req, res) => {
    try {
        const userId = req.user.id;

        let preferences = await NotificationPreference.findOne({
            where: { user_id: userId }
        });

        // Create default preferences if not exists
        if (!preferences) {
            preferences = await NotificationPreference.create({
                user_id: userId
            });
        }

        // Format response
        const formattedPreferences = {
            email: {
                academic: preferences.email_academic,
                attendance: preferences.email_attendance,
                meal: preferences.email_meal,
                event: preferences.email_event,
                payment: preferences.email_payment,
                system: preferences.email_system
            },
            push: {
                academic: preferences.push_academic,
                attendance: preferences.push_attendance,
                meal: preferences.push_meal,
                event: preferences.push_event,
                payment: preferences.push_payment,
                system: preferences.push_system
            },
            sms: {
                attendance: preferences.sms_attendance,
                payment: preferences.sms_payment
            }
        };

        res.json({
            success: true,
            data: formattedPreferences
        });

    } catch (error) {
        logger.error('Error getting notification preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim tercihleri alınamadı',
            error: error.message
        });
    }
};

/**
 * Update Notification Preferences
 * PUT /api/v1/notifications/preferences
 */
const updatePreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, push, sms } = req.body;

        let preferences = await NotificationPreference.findOne({
            where: { user_id: userId }
        });

        if (!preferences) {
            preferences = await NotificationPreference.create({
                user_id: userId
            });
        }

        const updateData = {};

        // Email preferences
        if (email) {
            if (email.academic !== undefined) updateData.email_academic = email.academic;
            if (email.attendance !== undefined) updateData.email_attendance = email.attendance;
            if (email.meal !== undefined) updateData.email_meal = email.meal;
            if (email.event !== undefined) updateData.email_event = email.event;
            if (email.payment !== undefined) updateData.email_payment = email.payment;
            if (email.system !== undefined) updateData.email_system = email.system;
        }

        // Push preferences
        if (push) {
            if (push.academic !== undefined) updateData.push_academic = push.academic;
            if (push.attendance !== undefined) updateData.push_attendance = push.attendance;
            if (push.meal !== undefined) updateData.push_meal = push.meal;
            if (push.event !== undefined) updateData.push_event = push.event;
            if (push.payment !== undefined) updateData.push_payment = push.payment;
            if (push.system !== undefined) updateData.push_system = push.system;
        }

        // SMS preferences
        if (sms) {
            if (sms.attendance !== undefined) updateData.sms_attendance = sms.attendance;
            if (sms.payment !== undefined) updateData.sms_payment = sms.payment;
        }

        await preferences.update(updateData);

        res.json({
            success: true,
            message: 'Bildirim tercihleri güncellendi'
        });

    } catch (error) {
        logger.error('Error updating notification preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim tercihleri güncellenemedi',
            error: error.message
        });
    }
};

/**
 * Create Notification (Internal use)
 */
const createNotification = async (userId, title, message, category = 'system', type = 'info', actionUrl = null, metadata = null) => {
    try {
        const notification = await Notification.create({
            user_id: userId,
            title,
            message,
            category,
            type,
            action_url: actionUrl,
            metadata
        });

        // TODO: Emit via WebSocket if connected
        // socketService.emitToUser(userId, 'notification', notification);

        return notification;
    } catch (error) {
        logger.error('Error creating notification:', error);
        throw error;
    }
};

/**
 * Create Bulk Notifications (Internal use)
 */
const createBulkNotifications = async (userIds, title, message, category = 'system', type = 'info', actionUrl = null, metadata = null) => {
    try {
        const notifications = userIds.map(userId => ({
            user_id: userId,
            title,
            message,
            category,
            type,
            action_url: actionUrl,
            metadata
        }));

        await Notification.bulkCreate(notifications);

        // TODO: Emit via WebSocket to all connected users
        // userIds.forEach(userId => socketService.emitToUser(userId, 'notification', ...));

        return true;
    } catch (error) {
        logger.error('Error creating bulk notifications:', error);
        throw error;
    }
};

module.exports = {
    getNotifications,
    getRecentNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getPreferences,
    updatePreferences,
    createNotification,
    createBulkNotifications
};
