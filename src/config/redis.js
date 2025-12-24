const redis = require('redis');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
const initializeRedis = async () => {
    // Check if Redis is configured
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        logger.warn('⚠️ REDIS_URL not set - Redis caching disabled');
        return null;
    }

    try {
        client = redis.createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger.error('Redis max reconnection attempts reached');
                        return new Error('Max reconnection attempts reached');
                    }
                    return Math.min(retries * 100, 3000);
                },
            },
        });

        client.on('error', (err) => {
            logger.error('Redis Client Error:', err);
            isConnected = false;
        });

        client.on('connect', () => {
            logger.info('🔄 Connecting to Redis...');
        });

        client.on('ready', () => {
            logger.info('✅ Redis connected and ready');
            isConnected = true;
        });

        client.on('end', () => {
            logger.info('Redis connection closed');
            isConnected = false;
        });

        await client.connect();
        return client;
    } catch (error) {
        logger.error('Failed to initialize Redis:', error);
        return null;
    }
};

/**
 * Get Redis client
 */
const getClient = () => {
    if (!client || !isConnected) {
        return null;
    }
    return client;
};

/**
 * Check if Redis is available
 */
const isAvailable = () => {
    return isConnected && client !== null;
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached value or null
 */
const get = async (key) => {
    if (!isAvailable()) return null;

    try {
        const value = await client.get(key);
        if (value) {
            return JSON.parse(value);
        }
        return null;
    } catch (error) {
        logger.error(`Redis GET error for key ${key}:`, error);
        return null;
    }
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds (default: 60)
 * @returns {Promise<boolean>} - Success status
 */
const set = async (key, value, ttlSeconds = 60) => {
    if (!isAvailable()) return false;

    try {
        await client.setEx(key, ttlSeconds, JSON.stringify(value));
        return true;
    } catch (error) {
        logger.error(`Redis SET error for key ${key}:`, error);
        return false;
    }
};

/**
 * Delete key from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Success status
 */
const del = async (key) => {
    if (!isAvailable()) return false;

    try {
        await client.del(key);
        return true;
    } catch (error) {
        logger.error(`Redis DEL error for key ${key}:`, error);
        return false;
    }
};

/**
 * Delete keys matching pattern
 * @param {string} pattern - Key pattern (e.g., "analytics:*")
 * @returns {Promise<number>} - Number of deleted keys
 */
const delByPattern = async (pattern) => {
    if (!isAvailable()) return 0;

    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
        return keys.length;
    } catch (error) {
        logger.error(`Redis pattern DEL error for ${pattern}:`, error);
        return 0;
    }
};

/**
 * Health check
 * @returns {Promise<boolean>}
 */
const healthCheck = async () => {
    if (!isAvailable()) return false;

    try {
        await client.ping();
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Close Redis connection
 */
const close = async () => {
    if (client) {
        await client.quit();
        client = null;
        isConnected = false;
    }
};

module.exports = {
    initializeRedis,
    getClient,
    isAvailable,
    get,
    set,
    del,
    delByPattern,
    healthCheck,
    close,
};
