const cron = require('node-cron');
const db = require('../models');
const logger = require('../utils/logger');
const { Op, fn, col } = require('sequelize');

const {
    User, Student, Enrollment, AttendanceRecord, AttendanceSession,
    MealReservation, Event, EventRegistration
} = db;

/**
 * Analytics Aggregation Job
 * Runs daily at 03:00 to pre-calculate analytics data
 */
const startAnalyticsAggregationJob = () => {
    logger.info('⏰ Analytics Aggregation Job scheduled (Daily at 03:00)');

    cron.schedule('0 3 * * *', async () => {
        logger.info('🔄 Running Analytics Aggregation Job...');

        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Aggregate daily statistics
            const stats = {
                date: yesterday.toISOString().split('T')[0],

                // User stats
                totalUsers: await User.count({ where: { status: 'active' } }),
                newUsersYesterday: await User.count({
                    where: {
                        created_at: { [Op.between]: [yesterday, today] }
                    }
                }),

                // Enrollment stats
                totalEnrollments: await Enrollment.count({ where: { status: 'enrolled' } }),

                // Attendance stats
                attendanceRecordsYesterday: await AttendanceRecord.count({
                    include: [{
                        model: AttendanceSession,
                        as: 'session',
                        where: { session_date: { [Op.between]: [yesterday, today] } }
                    }]
                }),

                // Meal stats
                mealReservationsYesterday: await MealReservation.count({
                    where: {
                        reservation_date: { [Op.between]: [yesterday, today] }
                    }
                }),

                // Event stats
                eventRegistrationsYesterday: await EventRegistration.count({
                    where: {
                        created_at: { [Op.between]: [yesterday, today] }
                    }
                })
            };

            // Log the aggregated stats (could be stored in a separate analytics table)
            logger.info('📊 Daily Analytics Summary:', stats);

            // Calculate GPA distribution
            const gpaStats = await Student.findAll({
                attributes: [
                    [fn('AVG', col('gpa')), 'avgGpa'],
                    [fn('MIN', col('gpa')), 'minGpa'],
                    [fn('MAX', col('gpa')), 'maxGpa'],
                    [fn('COUNT', col('id')), 'studentCount']
                ],
                where: { gpa: { [Op.not]: null } },
                raw: true
            });

            logger.info('📊 GPA Statistics:', gpaStats[0]);

            // Clean up old notifications (older than 90 days)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const deletedNotifications = await db.Notification.destroy({
                where: {
                    created_at: { [Op.lt]: ninetyDaysAgo },
                    read: true
                }
            });

            logger.info(`🗑️ Cleaned up ${deletedNotifications} old notifications`);

            // Clean up old sensor data (older than 30 days for raw data)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const deletedSensorData = await db.SensorData.destroy({
                where: {
                    timestamp: { [Op.lt]: thirtyDaysAgo }
                }
            });

            logger.info(`🗑️ Cleaned up ${deletedSensorData} old sensor readings`);

            logger.info('✅ Analytics Aggregation Job Completed');

        } catch (error) {
            logger.error('❌ Analytics Aggregation Job Failed:', error);
        }
    });
};

module.exports = startAnalyticsAggregationJob;
