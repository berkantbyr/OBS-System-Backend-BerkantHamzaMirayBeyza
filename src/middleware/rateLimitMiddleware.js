const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Skip rate limiting in development
const skipInDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Global Rate Limiter
 * 1000 requests per 15 minutes per IP (increased for development)
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100
    skip: skipInDevelopment, // Skip in development
    message: {
        success: false,
        message: 'Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin.',
        error: 'TOO_MANY_REQUESTS'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json(options.message);
    }
});

/**
 * Auth Rate Limiter
 * 20 requests per 15 minutes for login/register
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Increased from 5
    message: {
        success: false,
        message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
        error: 'TOO_MANY_AUTH_ATTEMPTS'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res, next, options) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json(options.message);
    }
});

/**
 * API Rate Limiter
 * 5000 requests per hour per IP for general API calls
 */
const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5000, // Increased from 1000
    skip: skipInDevelopment, // Skip in development
    message: {
        success: false,
        message: 'API istek limiti aşıldı. Lütfen 1 saat sonra tekrar deneyin.',
        error: 'API_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn(`API rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json(options.message);
    }
});

/**
 * Strict Rate Limiter for sensitive endpoints
 * 10 requests per hour
 */
const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Increased from 3
    message: {
        success: false,
        message: 'Bu işlem için istek limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
        error: 'STRICT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn(`Strict rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json(options.message);
    }
});

module.exports = {
    globalLimiter,
    authLimiter,
    apiLimiter,
    strictLimiter
};
