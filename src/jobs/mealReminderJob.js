const cron = require('node-cron');
const db = require('../models');
const { MealReservation, MealMenu, Cafeteria, User } = db;
const emailService = require('../services/emailService');
const notificationController = require('../controllers/notificationController');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Meal Reminder Job
 * Runs at 07:00, 11:00, and 16:00 to remind users of upcoming meals
 */
const startMealReminderJob = () => {
    logger.info('⏰ Meal Reminder Job scheduled (07:00, 11:00, 16:00)');

    // Morning reminder for breakfast (7:00)
    cron.schedule('0 7 * * *', async () => {
        await sendMealReminders('breakfast');
    });

    // Midday reminder for lunch (11:00)
    cron.schedule('0 11 * * *', async () => {
        await sendMealReminders('lunch');
    });

    // Afternoon reminder for dinner (16:00)
    cron.schedule('0 16 * * *', async () => {
        await sendMealReminders('dinner');
    });
};

const sendMealReminders = async (mealType) => {
    logger.info(`🔄 Running Meal Reminder Job for ${mealType}...`);

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find today's reservations for this meal type that are still pending
        const reservations = await MealReservation.findAll({
            where: {
                reservation_date: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                },
                meal_type: mealType,
                status: 'reserved'
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'email', 'first_name']
            }, {
                model: Cafeteria,
                as: 'cafeteria',
                attributes: ['name']
            }, {
                model: MealMenu,
                as: 'menu',
                attributes: ['name']
            }]
        });

        let reminderCount = 0;

        for (const reservation of reservations) {
            try {
                const mealTime = getMealTimeText(mealType);

                // Create in-app notification
                await notificationController.createNotification(
                    reservation.user.id,
                    'Yemek Hatırlatması',
                    `Bugün ${mealTime} için ${reservation.cafeteria?.name || 'yemekhane'} rezervasyonunuz var!`,
                    'meal',
                    'info',
                    '/meals/reservations',
                    { reservationId: reservation.id, mealType }
                );

                reminderCount++;
            } catch (err) {
                logger.error(`Error sending meal reminder to user ${reservation.user_id}:`, err);
            }
        }

        logger.info(`✅ Meal Reminder Job (${mealType}) Completed. Sent ${reminderCount} reminders.`);

    } catch (error) {
        logger.error(`❌ Meal Reminder Job (${mealType}) Failed:`, error);
    }
};

const getMealTimeText = (mealType) => {
    switch (mealType) {
        case 'breakfast': return 'kahvaltı (07:00-09:00)';
        case 'lunch': return 'öğle yemeği (11:30-13:30)';
        case 'dinner': return 'akşam yemeği (17:00-19:00)';
        default: return mealType;
    }
};

module.exports = startMealReminderJob;
