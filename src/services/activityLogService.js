const db = require('../models');
const { UserActivityLog } = db;
const logger = require('../utils/logger');

/**
 * Activity Log Service
 * Logs user activities for audit and security purposes
 */
class ActivityLogService {
  /**
   * Log a user activity
   * @param {Object} logData - Activity log data
   * @param {string} logData.userId - User ID
   * @param {string} logData.action - Action performed (e.g., 'login', 'logout', 'profile_update')
   * @param {string} logData.resourceType - Type of resource (optional)
   * @param {string} logData.resourceId - Resource ID (optional)
   * @param {string} logData.ipAddress - IP address (optional)
   * @param {string} logData.userAgent - User agent (optional)
   * @param {Object} logData.details - Additional details (optional)
   * @param {string} logData.status - Status: 'success', 'failure', 'pending' (default: 'success')
   * @param {string} logData.errorMessage - Error message if status is 'failure' (optional)
   * @returns {Promise<Object>} Created log entry
   */
  async logActivity({
    userId,
    action,
    resourceType = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    details = null,
    status = 'success',
    errorMessage = null,
  }) {
    try {
      const logEntry = await UserActivityLog.create({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        ip_address: ipAddress,
        user_agent: userAgent,
        details,
        status,
        error_message: errorMessage,
      });

      logger.debug(`Activity logged: ${action} by user ${userId}`);
      return logEntry;
    } catch (error) {
      // Don't throw error - logging should not break the main flow
      logger.error('Failed to log activity:', error);
      return null;
    }
  }

  /**
   * Get activity logs for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of logs to return
   * @param {number} options.offset - Offset for pagination
   * @param {string} options.action - Filter by action
   * @param {Date} options.startDate - Start date filter
   * @param {Date} options.endDate - End date filter
   * @returns {Promise<Array>} Array of log entries
   */
  async getUserActivities(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      action = null,
      startDate = null,
      endDate = null,
    } = options;

    const where = { user_id: userId };

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[db.Sequelize.Op.gte] = startDate;
      }
      if (endDate) {
        where.created_at[db.Sequelize.Op.lte] = endDate;
      }
    }

    return await UserActivityLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
  }

  /**
   * Get activity logs by action
   * @param {string} action - Action to filter by
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of log entries
   */
  async getActivitiesByAction(action, options = {}) {
    const { limit = 100, offset = 0 } = options;

    return await UserActivityLog.findAll({
      where: { action },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
  }

  /**
   * Get recent activities (all users)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of log entries
   */
  async getRecentActivities(options = {}) {
    const { limit = 100 } = options;

    return await UserActivityLog.findAll({
      order: [['created_at', 'DESC']],
      limit,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name', 'role'],
        },
      ],
    });
  }

  /**
   * Get activity statistics for a user
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Statistics object
   */
  async getUserActivityStats(userId, startDate = null, endDate = null) {
    const where = { user_id: userId };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[db.Sequelize.Op.gte] = startDate;
      }
      if (endDate) {
        where.created_at[db.Sequelize.Op.lte] = endDate;
      }
    }

    const logs = await UserActivityLog.findAll({ where });

    const stats = {
      total: logs.length,
      byAction: {},
      byStatus: {
        success: 0,
        failure: 0,
        pending: 0,
      },
      byDate: {},
    };

    logs.forEach((log) => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Count by status
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;

      // Count by date
      const dateKey = log.created_at.toISOString().split('T')[0];
      stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clean old activity logs (for maintenance)
   * @param {number} daysToKeep - Number of days to keep logs (default: 90)
   * @returns {Promise<number>} Number of deleted logs
   */
  async cleanOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedCount = await UserActivityLog.destroy({
      where: {
        created_at: {
          [db.Sequelize.Op.lt]: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned ${deletedCount} old activity logs (older than ${daysToKeep} days)`);
    return deletedCount;
  }
}

module.exports = new ActivityLogService();

