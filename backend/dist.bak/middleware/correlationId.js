"use strict";
/**
 * Correlation ID Middleware
 * Adds unique correlation IDs to requests for distributed tracing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCorrelationId = exports.correlationIdMiddleware = exports.CORRELATION_ID_HEADER = void 0;
const crypto_1 = require("crypto");
const logger_1 = require("../config/logger");
exports.CORRELATION_ID_HEADER = 'x-correlation-id';
/**
 * Middleware that adds a correlation ID to each request
 * - Uses existing header if provided (for distributed tracing)
 * - Generates a new UUID if not provided
 * - Adds correlation ID to response headers
 * - Attaches to request object for logging
 */
const correlationIdMiddleware = (req, res, next) => {
    // Use existing correlation ID from header or generate new one
    const correlationId = req.headers[exports.CORRELATION_ID_HEADER] || (0, crypto_1.randomUUID)();
    // Attach to request for use in handlers and logging
    req.correlationId = correlationId;
    // Add to response headers for client-side tracing
    res.setHeader(exports.CORRELATION_ID_HEADER, correlationId);
    // Add correlation ID to logger context for this request
    logger_1.logger.defaultMeta = {
        ...logger_1.logger.defaultMeta,
        correlationId,
    };
    next();
};
exports.correlationIdMiddleware = correlationIdMiddleware;
/**
 * Helper to get correlation ID from request
 */
const getCorrelationId = (req) => {
    return req.correlationId || 'unknown';
};
exports.getCorrelationId = getCorrelationId;
exports.default = exports.correlationIdMiddleware;
//# sourceMappingURL=correlationId.js.map