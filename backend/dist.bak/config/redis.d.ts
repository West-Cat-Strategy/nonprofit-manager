import { RedisClientType } from 'redis';
/**
 * Initialize Redis client connection
 */
export declare function initializeRedis(): Promise<void>;
/**
 * Get Redis client instance
 */
export declare function getRedisClient(): RedisClientType | null;
/**
 * Close Redis connection
 */
export declare function closeRedis(): Promise<void>;
/**
 * Cache helper functions
 */
/**
 * Get cached value
 */
export declare function getCached<T>(key: string): Promise<T | null>;
/**
 * Set cached value with TTL (in seconds)
 */
export declare function setCached(key: string, value: unknown, ttl?: number): Promise<boolean>;
/**
 * Delete cached value
 */
export declare function deleteCached(key: string): Promise<boolean>;
/**
 * Delete multiple cached values by pattern
 */
export declare function deleteCachedPattern(pattern: string): Promise<number>;
/**
 * Check if Redis is available
 */
export declare function isRedisAvailable(): boolean;
//# sourceMappingURL=redis.d.ts.map