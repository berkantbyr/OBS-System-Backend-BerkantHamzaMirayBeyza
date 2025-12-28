const webpush = require('web-push');
const logger = require('../utils/logger');

/**
 * Push Notification Service
 * Handles Web Push API notifications
 */
class PushNotificationService {
  constructor() {
    this.isInitialized = false;
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    this.vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@university.edu';

    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webpush.setVapidDetails(
        this.vapidSubject,
        this.vapidPublicKey,
        this.vapidPrivateKey
      );
      this.isInitialized = true;
      logger.info('✅ Push notification service initialized');
    } else {
      logger.warn('⚠️ VAPID keys not configured - Push notifications disabled');
    }
  }

  /**
   * Send push notification
   * @param {Object} subscription - Push subscription object
   * @param {Object} payload - Notification payload
   * @param {string} payload.title - Notification title
   * @param {string} payload.body - Notification body
   * @param {string} payload.icon - Icon URL (optional)
   * @param {string} payload.url - URL to open on click (optional)
   * @param {Object} payload.data - Additional data (optional)
   * @returns {Promise<Object>} Result
   */
  async sendNotification(subscription, payload) {
    if (!this.isInitialized) {
      logger.warn('Push notification service not initialized');
      return { success: false, error: 'Service not initialized' };
    }

    if (!subscription || !subscription.endpoint) {
      return { success: false, error: 'Invalid subscription' };
    }

    try {
      const notificationPayload = JSON.stringify({
        title: payload.title || 'Kampüs OBS',
        body: payload.body || payload.message || 'Yeni bildirim',
        icon: payload.icon || '/logo.png',
        badge: payload.badge || '/logo.png',
        tag: payload.tag || 'obs-notification',
        url: payload.url || '/',
        data: payload.data || {},
      });

      const result = await webpush.sendNotification(subscription, notificationPayload);
      logger.info(`Push notification sent: ${subscription.endpoint.substring(0, 50)}...`);
      return { success: true, statusCode: result.statusCode };
    } catch (error) {
      logger.error('Error sending push notification:', error);

      // Handle expired/invalid subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        return { success: false, error: 'Subscription expired', statusCode: error.statusCode };
      }

      return { success: false, error: error.message, statusCode: error.statusCode };
    }
  }

  /**
   * Send notification to multiple subscriptions
   * @param {Array} subscriptions - Array of subscription objects
   * @param {Object} payload - Notification payload
   * @returns {Promise<Object>} Results
   */
  async sendBulkNotifications(subscriptions, payload) {
    if (!this.isInitialized) {
      return { success: false, error: 'Service not initialized' };
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const promises = subscriptions.map(async (subscription) => {
      try {
        const result = await this.sendNotification(subscription, payload);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          if (result.statusCode === 410 || result.statusCode === 404) {
            // Subscription expired - should be removed from database
            results.errors.push({
              subscription: subscription.endpoint?.substring(0, 50),
              error: 'Subscription expired',
            });
          }
        }
        return result;
      } catch (error) {
        results.failed++;
        results.errors.push({
          subscription: subscription.endpoint?.substring(0, 50),
          error: error.message,
        });
        return { success: false, error: error.message };
      }
    });

    await Promise.allSettled(promises);

    logger.info(`Bulk push notifications: ${results.success} sent, ${results.failed} failed`);
    return results;
  }

  /**
   * Get VAPID public key (for client subscription)
   * @returns {string} VAPID public key
   */
  getPublicKey() {
    return this.vapidPublicKey;
  }

  /**
   * Check if service is initialized
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized;
  }
}

module.exports = new PushNotificationService();

