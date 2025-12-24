/**
 * New Relic Application Performance Monitoring (APM) Configuration
 * 
 * Setup Instructions:
 * 1. Sign up at https://newrelic.com/
 * 2. Install: npm install newrelic
 * 3. Set environment variables: NEW_RELIC_LICENSE_KEY, NEW_RELIC_APP_NAME
 * 4. Require this file at the VERY TOP of app.js: require('./config/newrelic');
 * 
 * This configuration file sets up New Relic for:
 * - Transaction tracing
 * - Error tracking
 * - Database query monitoring
 * - External service calls
 */

'use strict';

const logger = require('../utils/logger');

let newrelic = null;
let isInitialized = false;

/**
 * Initialize New Relic APM
 */
const initNewRelic = () => {
    const licenseKey = process.env.NEW_RELIC_LICENSE_KEY;
    const appName = process.env.NEW_RELIC_APP_NAME || 'Campus OBS Backend';

    if (!licenseKey) {
        logger.warn('⚠️ NEW_RELIC_LICENSE_KEY not set - New Relic APM disabled');
        return false;
    }

    try {
        // Set New Relic environment variables before requiring
        process.env.NEW_RELIC_NO_CONFIG_FILE = 'true';
        process.env.NEW_RELIC_APP_NAME = appName;
        process.env.NEW_RELIC_LICENSE_KEY = licenseKey;
        process.env.NEW_RELIC_LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'trace';
        process.env.NEW_RELIC_DISTRIBUTED_TRACING_ENABLED = 'true';
        process.env.NEW_RELIC_ERROR_COLLECTOR_ENABLED = 'true';
        process.env.NEW_RELIC_ERROR_COLLECTOR_IGNORE_STATUS_CODES = '400,401,403,404';

        // Require New Relic after setting env vars
        newrelic = require('newrelic');
        isInitialized = true;

        logger.info('✅ New Relic APM initialized');
        return true;
    } catch (error) {
        logger.error('Failed to initialize New Relic:', error.message);
        return false;
    }
};

/**
 * Record a custom event
 * @param {string} eventType - Event type name
 * @param {Object} attributes - Event attributes
 */
const recordCustomEvent = (eventType, attributes = {}) => {
    if (!isInitialized || !newrelic) return;

    try {
        newrelic.recordCustomEvent(eventType, {
            ...attributes,
            timestamp: Date.now(),
            environment: process.env.NODE_ENV || 'development',
        });
    } catch (error) {
        logger.error('New Relic recordCustomEvent error:', error);
    }
};

/**
 * Add custom attributes to current transaction
 * @param {Object} attributes - Custom attributes
 */
const addCustomAttributes = (attributes = {}) => {
    if (!isInitialized || !newrelic) return;

    try {
        Object.entries(attributes).forEach(([key, value]) => {
            newrelic.addCustomAttribute(key, value);
        });
    } catch (error) {
        logger.error('New Relic addCustomAttributes error:', error);
    }
};

/**
 * Set transaction name
 * @param {string} name - Transaction name
 */
const setTransactionName = (name) => {
    if (!isInitialized || !newrelic) return;

    try {
        newrelic.setTransactionName(name);
    } catch (error) {
        logger.error('New Relic setTransactionName error:', error);
    }
};

/**
 * Notice an error (manual error tracking)
 * @param {Error} error - Error object
 * @param {Object} customAttributes - Additional attributes
 */
const noticeError = (error, customAttributes = {}) => {
    if (!isInitialized || !newrelic) return;

    try {
        newrelic.noticeError(error, customAttributes);
    } catch (err) {
        logger.error('New Relic noticeError error:', err);
    }
};

/**
 * Start a web transaction
 * @param {string} name - Transaction name
 * @param {Function} handler - Transaction handler
 */
const startWebTransaction = (name, handler) => {
    if (!isInitialized || !newrelic) {
        return handler();
    }

    return newrelic.startWebTransaction(name, handler);
};

/**
 * Start a background transaction
 * @param {string} name - Transaction name
 * @param {string} group - Transaction group
 * @param {Function} handler - Transaction handler
 */
const startBackgroundTransaction = (name, group, handler) => {
    if (!isInitialized || !newrelic) {
        return handler();
    }

    return newrelic.startBackgroundTransaction(name, group, handler);
};

/**
 * Get browser timing header for frontend integration
 * @returns {string} - Browser timing header HTML
 */
const getBrowserTimingHeader = () => {
    if (!isInitialized || !newrelic) return '';

    try {
        return newrelic.getBrowserTimingHeader();
    } catch (error) {
        return '';
    }
};

/**
 * Middleware to add user info to New Relic transaction
 */
const newRelicMiddleware = (req, res, next) => {
    if (isInitialized && newrelic && req.user) {
        addCustomAttributes({
            userId: req.user.id,
            userRole: req.user.role,
            userEmail: req.user.email,
        });
    }
    next();
};

/**
 * Check if New Relic is available
 */
const isAvailable = () => isInitialized;

module.exports = {
    initNewRelic,
    recordCustomEvent,
    addCustomAttributes,
    setTransactionName,
    noticeError,
    startWebTransaction,
    startBackgroundTransaction,
    getBrowserTimingHeader,
    newRelicMiddleware,
    isAvailable,
};
