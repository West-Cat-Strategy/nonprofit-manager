"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRedis = initializeRedis;
exports.getRedisClient = getRedisClient;
exports.closeRedis = closeRedis;
exports.getCached = getCached;
exports.setCached = setCached;
exports.deleteCached = deleteCached;
exports.deleteCachedPattern = deleteCachedPattern;
exports.isRedisAvailable = isRedisAvailable;
const redis_1 = require("redis");
const logger_1 = require("./logger");
let redisClient = null;
/**
 * Initialize Redis client connection
 */
async function initializeRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const isRedisEnabled = process.env.REDIS_ENABLED !== 'false'; // Default to enabled
    if (!isRedisEnabled) {
        logger_1.logger.info('Redis caching is disabled');
        return;
    }
    try {
        redisClient = (0, redis_1.createClient)({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger_1.logger.error('Redis reconnection failed after 10 attempts');
                        return new Error('Redis reconnection limit reached');
                    }
                    return Math.min(retries * 100, 3000);
                },
            },
        });
        redisClient.on('error', (err) => {
            logger_1.logger.error('Redis client error:', err);
        });
        redisClient.on('connect', () => {
            logger_1.logger.info('Redis client connected');
        });
        redisClient.on('ready', () => {
            logger_1.logger.info('Redis client ready');
        });
        redisClient.on('reconnecting', () => {
            logger_1.logger.warn('Redis client reconnecting...');
        });
        await redisClient.connect();
        logger_1.logger.info(`Redis initialized successfully at ${redisUrl}`);
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize Redis:', error);
        // Don't throw - allow app to continue without caching
        redisClient = null;
    }
}
/**
 * Get Redis client instance
 */
function getRedisClient() {
    return redisClient;
}
/**
 * Close Redis connection
 */
async function closeRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger_1.logger.info('Redis connection closed');
        }
        catch (error) {
            logger_1.logger.error('Error closing Redis connection:', error);
        }
        finally {
            redisClient = null;
        }
    }
}
/**
 * Cache helper functions
 */
/**
 * Get cached value
 */
async function getCached(key) {
    if (!redisClient?.isReady) {
        return null;
    }
    try {
        const cached = await redisClient.get(key);
        if (cached) {
            return JSON.parse(cached);
        }
    }
    catch (error) {
        logger_1.logger.error(`Error getting cached value for key ${key}:`, error);
    }
    return null;
}
/**
 * Set cached value with TTL (in seconds)
 */
async function setCached(key, value, ttl = 300) {
    if (!redisClient?.isReady) {
        return false;
    }
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
        return true;
    }
    catch (error) {
        logger_1.logger.error(`Error setting cached value for key ${key}:`, error);
        return false;
    }
}
/**
 * Delete cached value
 */
async function deleteCached(key) {
    if (!redisClient?.isReady) {
        return false;
    }
    try {
        await redisClient.del(key);
        return true;
    }
    catch (error) {
        logger_1.logger.error(`Error deleting cached value for key ${key}:`, error);
        return false;
    }
}
/**
 * Delete multiple cached values by pattern
 */
async function deleteCachedPattern(pattern) {
    if (!redisClient?.isReady) {
        return 0;
    }
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            return keys.length;
        }
        return 0;
    }
    catch (error) {
        logger_1.logger.error(`Error deleting cached values for pattern ${pattern}:`, error);
        return 0;
    }
}
/**
 * Check if Redis is available
 */
function isRedisAvailable() {
    return redisClient?.isReady ?? false;
}
//# sourceMappingURL=redis.js.map