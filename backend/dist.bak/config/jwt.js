"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtSecret = void 0;
const logger_1 = require("./logger");
/**
 * Get JWT secret from environment or throw error.
 * Never use fallback secrets in production.
 */
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        logger_1.logger.error('JWT_SECRET environment variable is not set');
        throw new Error('JWT_SECRET must be configured');
    }
    return secret;
};
exports.getJwtSecret = getJwtSecret;
//# sourceMappingURL=jwt.js.map