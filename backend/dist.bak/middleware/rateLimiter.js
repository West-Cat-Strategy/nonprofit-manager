"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrationLimiter = exports.passwordResetLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const constants_1 = require("../config/constants");
const redis_1 = require("../config/redis");
// Disable rate limiting in test environment
const isTestEnv = process.env.NODE_ENV === 'test';
class HybridRateLimitStore {
    constructor(prefix) {
        this.localKeys = false;
        this.windowMs = constants_1.RATE_LIMIT.WINDOW_MS;
        this.memoryStore = new express_rate_limit_1.MemoryStore();
        this.prefix = prefix;
    }
    init(options) {
        this.windowMs = options.windowMs;
        this.memoryStore.init?.(options);
    }
    async increment(key) {
        const redis = (0, redis_1.getRedisClient)();
        if (!redis?.isReady) {
            return this.memoryStore.increment(key);
        }
        const redisKey = `${this.prefix}${key}`;
        const totalHits = await redis.incr(redisKey);
        if (totalHits === 1) {
            await redis.pExpire(redisKey, this.windowMs);
        }
        const ttl = await redis.pTTL(redisKey);
        const resetTime = new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs));
        return { totalHits, resetTime };
    }
    async decrement(key) {
        const redis = (0, redis_1.getRedisClient)();
        if (!redis?.isReady) {
            return this.memoryStore.decrement(key);
        }
        const redisKey = `${this.prefix}${key}`;
        await redis.decr(redisKey);
    }
    async resetKey(key) {
        const redis = (0, redis_1.getRedisClient)();
        if (!redis?.isReady) {
            return this.memoryStore.resetKey(key);
        }
        const redisKey = `${this.prefix}${key}`;
        await redis.del(redisKey);
    }
}
const buildStore = (prefix) => new HybridRateLimitStore(prefix);
// General API rate limiter
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(constants_1.RATE_LIMIT.WINDOW_MS)),
    max: isTestEnv ? 10000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || String(constants_1.RATE_LIMIT.MAX_REQUESTS)),
    message: constants_1.ERROR_MESSAGES.TOO_MANY_REQUESTS,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: buildStore('rl:api:'),
    handler: (req, res) => {
        const rateLimitReq = req;
        res.status(constants_1.HTTP_STATUS.TOO_MANY_REQUESTS).json({
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: rateLimitReq.rateLimit?.resetTime,
        });
    },
});
// Strict rate limiter for authentication endpoints
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(constants_1.RATE_LIMIT.AUTH_WINDOW_MS)),
    max: isTestEnv ? 10000 : parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || String(constants_1.RATE_LIMIT.AUTH_MAX_ATTEMPTS)),
    skipSuccessfulRequests: true, // Don't count successful requests
    message: constants_1.ERROR_MESSAGES.TOO_MANY_LOGIN_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('rl:auth:'),
    handler: (req, res) => {
        const rateLimitReq = req;
        res.status(constants_1.HTTP_STATUS.TOO_MANY_REQUESTS).json({
            error: 'Too many login attempts',
            message: constants_1.ERROR_MESSAGES.TOO_MANY_LOGIN_ATTEMPTS,
            retryAfter: rateLimitReq.rateLimit?.resetTime,
        });
    },
});
// Rate limiter for password reset endpoints
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT.PASSWORD_RESET_WINDOW_MS,
    max: constants_1.RATE_LIMIT.PASSWORD_RESET_MAX_ATTEMPTS,
    skipSuccessfulRequests: false,
    message: constants_1.ERROR_MESSAGES.TOO_MANY_PASSWORD_RESETS,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('rl:password-reset:'),
    handler: (req, res) => {
        const rateLimitReq = req;
        res.status(constants_1.HTTP_STATUS.TOO_MANY_REQUESTS).json({
            error: 'Too many password reset requests',
            message: constants_1.ERROR_MESSAGES.TOO_MANY_PASSWORD_RESETS,
            retryAfter: rateLimitReq.rateLimit?.resetTime,
        });
    },
});
// Rate limiter for registration endpoint
exports.registrationLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT.REGISTRATION_WINDOW_MS,
    max: constants_1.RATE_LIMIT.REGISTRATION_MAX_ATTEMPTS,
    skipSuccessfulRequests: false,
    message: constants_1.ERROR_MESSAGES.TOO_MANY_REGISTRATIONS,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('rl:registration:'),
    handler: (req, res) => {
        const rateLimitReq = req;
        res.status(constants_1.HTTP_STATUS.TOO_MANY_REQUESTS).json({
            error: 'Too many registration attempts',
            message: constants_1.ERROR_MESSAGES.TOO_MANY_REGISTRATIONS,
            retryAfter: rateLimitReq.rateLimit?.resetTime,
        });
    },
});
//# sourceMappingURL=rateLimiter.js.map