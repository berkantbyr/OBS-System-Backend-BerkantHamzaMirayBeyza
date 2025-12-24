/**
 * Sentry Error Tracking Configuration
 * 
 * Setup Instructions:
 * 1. Install: npm install @sentry/node @sentry/profiling-node
 * 2. Set environment variable: SENTRY_DSN=your-sentry-dsn
 * 3. Import this module in app.js at the very top
 * 
 * Usage:
 * const { initSentry, sentryErrorHandler, sentryRequestHandler } = require('./config/sentry');
 * initSentry();
 * app.use(sentryRequestHandler());
 * // ... your routes
 * app.use(sentryErrorHandler());
 */

const logger = require('../utils/logger');

let Sentry = null;
let isInitialized = false;

/**
 * Initialize Sentry SDK
 * Call this at the very start of your application
 */
const initSentry = () => {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
        logger.warn('⚠️ SENTRY_DSN not set - Sentry error tracking disabled');
        return false;
    }

    try {
        Sentry = require('@sentry/node');

        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || 'development',
            release: process.env.APP_VERSION || '1.0.0',

            // Performance Monitoring
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

            // Set sampling rate for profiling (requires @sentry/profiling-node)
            profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

            // Filter out sensitive data
            beforeSend(event) {
                // Remove sensitive headers
                if (event.request?.headers) {
                    delete event.request.headers.authorization;
                    delete event.request.headers.cookie;
                }
                return event;
            },

            // Ignore certain errors
            ignoreErrors: [
                'TokenExpiredError',
                'JsonWebTokenError',
                'UnauthorizedError',
            ],
        });

        isInitialized = true;
        logger.info('✅ Sentry error tracking initialized');
        return true;
    } catch (error) {
        logger.error('Failed to initialize Sentry:', error.message);
        return false;
    }
};

/**
 * Sentry request handler middleware
 * Should be added at the beginning of middleware chain
 */
const sentryRequestHandler = () => {
    if (!isInitialized || !Sentry) {
        return (req, res, next) => next();
    }
    return Sentry.Handlers.requestHandler();
};

/**
 * Sentry tracing handler middleware
 * For performance monitoring
 */
const sentryTracingHandler = () => {
    if (!isInitialized || !Sentry) {
        return (req, res, next) => next();
    }
    return Sentry.Handlers.tracingHandler();
};

/**
 * Sentry error handler middleware
 * Should be added after all routes but before other error handlers
 */
const sentryErrorHandler = () => {
    if (!isInitialized || !Sentry) {
        return (err, req, res, next) => next(err);
    }
    return Sentry.Handlers.errorHandler();
};

/**
 * Capture exception manually
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
const captureException = (error, context = {}) => {
    if (!isInitialized || !Sentry) {
        logger.error('Uncaptured Sentry exception:', error);
        return;
    }

    Sentry.withScope((scope) => {
        if (context.user) {
            scope.setUser(context.user);
        }
        if (context.tags) {
            Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value);
            });
        }
        if (context.extra) {
            Object.entries(context.extra).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
        }
        Sentry.captureException(error);
    });
};

/**
 * Capture message manually
 * @param {string} message - Message to capture
 * @param {string} level - 'info' | 'warning' | 'error'
 */
const captureMessage = (message, level = 'info') => {
    if (!isInitialized || !Sentry) {
        logger[level](message);
        return;
    }
    Sentry.captureMessage(message, level);
};

/**
 * Set user context for Sentry
 * @param {Object} user - User object with id, email, etc.
 */
const setUser = (user) => {
    if (!isInitialized || !Sentry) return;

    Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
    });
};

/**
 * Clear user context
 */
const clearUser = () => {
    if (!isInitialized || !Sentry) return;
    Sentry.setUser(null);
};

module.exports = {
    initSentry,
    sentryRequestHandler,
    sentryTracingHandler,
    sentryErrorHandler,
    captureException,
    captureMessage,
    setUser,
    clearUser,
    isInitialized: () => isInitialized,
};
