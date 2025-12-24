const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Cache configuration for different routes
 */
const CACHE_CONFIG = {
    // Analytics routes - 1 minute cache
    '/api/v1/analytics': { ttl: 60, prefix: 'analytics' },

    // Course catalog - 5 minutes cache
    '/api/v1/courses': { ttl: 300, prefix: 'courses' },

    // Menu - 10 minutes cache
    '/api/v1/meals/menu': { ttl: 600, prefix: 'menu' },

    // Sensors - 30 seconds cache
    '/api/v1/sensors': { ttl: 30, prefix: 'sensors' },

    // Departments - 30 minutes cache
    '/api/v1/departments': { ttl: 1800, prefix: 'departments' },
};

/**
 * Generate cache key from request
 */
const generateCacheKey = (req, prefix) => {
    const userId = req.user?.id || 'anonymous';
    const query = JSON.stringify(req.query);
    const path = req.originalUrl.split('?')[0];

    return `${prefix}:${path}:${userId}:${query}`;
};

/**
 * Find matching cache config for request path
 */
const findCacheConfig = (path) => {
    for (const [route, config] of Object.entries(CACHE_CONFIG)) {
        if (path.startsWith(route)) {
            return config;
        }
    }
    return null;
};

/**
 * Cache middleware factory
 * @param {Object} options - Custom cache options
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (options = {}) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Check if Redis is available
        if (!redis.isAvailable()) {
            return next();
        }

        // Find cache config for this route
        const config = options.ttl ? options : findCacheConfig(req.originalUrl);

        if (!config) {
            return next();
        }

        const cacheKey = generateCacheKey(req, config.prefix || 'cache');

        try {
            // Try to get from cache
            const cachedData = await redis.get(cacheKey);

            if (cachedData) {
                logger.debug(`Cache HIT: ${cacheKey}`);
                return res.json(cachedData);
            }

            logger.debug(`Cache MISS: ${cacheKey}`);

            // Store original json method
            const originalJson = res.json.bind(res);

            // Override json method to cache the response
            res.json = (data) => {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redis.set(cacheKey, data, config.ttl).catch((err) => {
                        logger.error('Failed to cache response:', err);
                    });
                }
                return originalJson(data);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error:', error);
            next();
        }
    };
};

/**
 * Invalidate cache by prefix
 * Call this when data is updated
 */
const invalidateCache = async (prefix) => {
    try {
        const deleted = await redis.delByPattern(`${prefix}:*`);
        logger.info(`Invalidated ${deleted} cache entries for prefix: ${prefix}`);
        return deleted;
    } catch (error) {
        logger.error('Cache invalidation error:', error);
        return 0;
    }
};

/**
 * Middleware to invalidate cache after mutation operations
 */
const invalidateCacheMiddleware = (prefix) => {
    return async (req, res, next) => {
        // Store original send
        const originalSend = res.send.bind(res);

        res.send = function (body) {
            // Invalidate cache after successful mutation
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    invalidateCache(prefix).catch(() => { });
                }
            }
            return originalSend(body);
        };

        next();
    };
};

module.exports = {
    cacheMiddleware,
    invalidateCache,
    invalidateCacheMiddleware,
    CACHE_CONFIG,
};
