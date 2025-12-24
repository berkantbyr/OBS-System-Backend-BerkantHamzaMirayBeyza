const cron = require('node-cron');
const db = require('../models');
const { Event, EventRegistration, User } = db;
const emailService = require('../services/emailService');
const notificationController = require('../controllers/notificationController');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Event Reminder Job
 * Runs every hour - sends reminders for events starting in 24h and 1h
 */
const startEventReminderJob = () => {
    logger.info('⏰ Event Reminder Job scheduled (Every hour)');

    cron.schedule('0 * * * *', async () => {
        logger.info('🔄 Running Event Reminder Job...');

        try {
            const now = new Date();

            // 24 hours from now
            const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);

            // 1 hour from now
            const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
            const in59Min = new Date(now.getTime() + 59 * 60 * 1000);

            // Find events starting in ~24 hours
            const eventsIn24h = await Event.findAll({
                where: {
                    start_date: {
                        [Op.between]: [in23Hours, in24Hours]
                    },
                    status: 'published'
                },
                include: [{
                    model: EventRegistration,
                    as: 'registrations',
                    where: { status: 'registered' },
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'email', 'first_name']
                    }]
                }]
            });

            // Find events starting in ~1 hour
            const eventsIn1h = await Event.findAll({
                where: {
                    start_date: {
                        [Op.between]: [in59Min, in1Hour]
                    },
                    status: 'published'
                },
                include: [{
                    model: EventRegistration,
                    as: 'registrations',
                    where: { status: 'registered' },
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'email', 'first_name']
                    }]
                }]
            });

            let reminderCount = 0;

            // Send 24h reminders
            for (const event of eventsIn24h) {
                for (const registration of event.registrations) {
                    try {
                        // Create in-app notification
                        await notificationController.createNotification(
                            registration.user.id,
                            'Etkinlik Hatırlatması',
                            `"${event.title}" etkinliği yarın başlıyor!`,
                            'event',
                            'info',
                            `/events/${event.id}`,
                            { eventId: event.id, reminderType: '24h' }
                        );

                        // Send email
                        await emailService.sendEventReminderEmail(
                            registration.user.email,
                            registration.user.first_name,
                            event.title,
                            event.start_date,
                            event.location,
                            '24 saat'
                        );

                        reminderCount++;
                    } catch (err) {
                        logger.error(`Error sending 24h reminder to ${registration.user.email}:`, err);
                    }
                }
            }

            // Send 1h reminders
            for (const event of eventsIn1h) {
                for (const registration of event.registrations) {
                    try {
                        await notificationController.createNotification(
                            registration.user.id,
                            'Etkinlik Başlıyor!',
                            `"${event.title}" etkinliği 1 saat içinde başlıyor!`,
                            'event',
                            'warning',
                            `/events/${event.id}`,
                            { eventId: event.id, reminderType: '1h' }
                        );

                        await emailService.sendEventReminderEmail(
                            registration.user.email,
                            registration.user.first_name,
                            event.title,
                            event.start_date,
                            event.location,
                            '1 saat'
                        );

                        reminderCount++;
                    } catch (err) {
                        logger.error(`Error sending 1h reminder to ${registration.user.email}:`, err);
                    }
                }
            }

            logger.info(`✅ Event Reminder Job Completed. Sent ${reminderCount} reminders.`);

        } catch (error) {
            logger.error('❌ Event Reminder Job Failed:', error);
        }
    });
};

module.exports = startEventReminderJob;
