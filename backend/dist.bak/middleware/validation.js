"use strict";
/**
 * Validation Middleware
 * Common validation patterns and sanitization utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitInfo = exports.validators = exports.handleValidationErrors = void 0;
exports.sanitizeFields = sanitizeFields;
const express_validator_1 = require("express-validator");
const logger_1 = require("../config/logger");
/**
 * Middleware to check validation results
 * Use after express-validator validation chains
 */
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        logger_1.logger.warn('Validation failed', {
            errors: errors.array(),
            path: req.path,
            method: req.method,
            correlationId: req.correlationId,
        });
        res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map((err) => ({
                field: 'path' in err ? err.path : 'unknown',
                message: err.msg,
            })),
        });
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
/**
 * Common validation patterns
 */
exports.validators = {
    // UUID validation
    uuid: (field, location = 'param') => {
        const validator = location === 'body' ? (0, express_validator_1.body)(field) : location === 'param' ? (0, express_validator_1.param)(field) : (0, express_validator_1.query)(field);
        return validator.isUUID(4).withMessage(`${field} must be a valid UUID`);
    },
    // Email validation with sanitization
    email: (field = 'email', required = true) => {
        let validator = (0, express_validator_1.body)(field).trim().normalizeEmail();
        if (required) {
            validator = validator.notEmpty().withMessage('Email is required');
        }
        else {
            validator = validator.optional({ nullable: true, checkFalsy: true });
        }
        return validator.isEmail().withMessage('Invalid email format');
    },
    // Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    password: (field = 'password') => {
        return (0, express_validator_1.body)(field)
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
            .matches(/[0-9]/).withMessage('Password must contain at least one number');
    },
    // Name validation (letters, spaces, hyphens, apostrophes)
    name: (field, required = true) => {
        let validator = (0, express_validator_1.body)(field).trim();
        if (required) {
            validator = validator.notEmpty().withMessage(`${field} is required`);
        }
        else {
            validator = validator.optional({ nullable: true, checkFalsy: true });
        }
        return validator
            .isLength({ max: 100 }).withMessage(`${field} must be 100 characters or less`)
            .matches(/^[a-zA-Z\s'-]+$/).withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`);
    },
    // Phone validation
    phone: (field = 'phone') => {
        return (0, express_validator_1.body)(field)
            .optional({ nullable: true, checkFalsy: true })
            .trim()
            .matches(/^[\d\s\-+().ext]+$/).withMessage('Invalid phone number format')
            .isLength({ max: 30 }).withMessage('Phone number too long');
    },
    // URL validation
    url: (field) => {
        return (0, express_validator_1.body)(field)
            .optional({ nullable: true, checkFalsy: true })
            .trim()
            .isURL({ protocols: ['http', 'https'] }).withMessage('Invalid URL format');
    },
    // Date validation
    date: (field, required = false) => {
        let validator = (0, express_validator_1.body)(field);
        if (required) {
            validator = validator.notEmpty().withMessage(`${field} is required`);
        }
        else {
            validator = validator.optional({ nullable: true, checkFalsy: true });
        }
        return validator.isISO8601().withMessage(`${field} must be a valid date`);
    },
    // Positive integer validation
    positiveInt: (field, location = 'body', required = true) => {
        const validator = location === 'body' ? (0, express_validator_1.body)(field) : (0, express_validator_1.query)(field);
        let chain = validator;
        if (required) {
            chain = chain.notEmpty().withMessage(`${field} is required`);
        }
        else {
            chain = chain.optional({ nullable: true, checkFalsy: true });
        }
        return chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer`);
    },
    // Amount validation (for currency - cents)
    amount: (field = 'amount') => {
        return (0, express_validator_1.body)(field)
            .notEmpty().withMessage('Amount is required')
            .isInt({ min: 1 }).withMessage('Amount must be a positive integer (in cents)');
    },
    // Text sanitization (prevent XSS)
    sanitizedText: (field, maxLength = 500, required = false) => {
        let validator = (0, express_validator_1.body)(field).trim();
        if (required) {
            validator = validator.notEmpty().withMessage(`${field} is required`);
        }
        else {
            validator = validator.optional({ nullable: true, checkFalsy: true });
        }
        return validator
            .isLength({ max: maxLength }).withMessage(`${field} must be ${maxLength} characters or less`)
            .escape(); // Escape HTML entities
    },
    // Pagination
    pagination: () => [
        (0, express_validator_1.query)('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer')
            .toInt(),
        (0, express_validator_1.query)('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
            .toInt(),
        (0, express_validator_1.query)('sort_by')
            .optional()
            .isString()
            .matches(/^[a-z_]+$/).withMessage('Invalid sort field'),
        (0, express_validator_1.query)('sort_order')
            .optional()
            .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    ],
    // Search query
    search: () => {
        return (0, express_validator_1.query)('search')
            .optional()
            .trim()
            .isLength({ max: 100 }).withMessage('Search query too long')
            .escape();
    },
};
/**
 * Sanitize object keys (remove unexpected fields)
 */
function sanitizeFields(data, allowedFields) {
    const sanitized = {};
    for (const field of allowedFields) {
        if (field in data) {
            sanitized[field] = data[field];
        }
    }
    return sanitized;
}
/**
 * Rate limit specific validation
 */
const rateLimitInfo = (req, res, next) => {
    // Add rate limit headers info to response
    res.on('finish', () => {
        const remaining = res.getHeader('X-RateLimit-Remaining');
        if (remaining !== undefined && parseInt(remaining) <= 10) {
            logger_1.logger.warn('Rate limit approaching', {
                remaining,
                ip: req.ip,
                path: req.path,
                correlationId: req.correlationId,
            });
        }
    });
    next();
};
exports.rateLimitInfo = rateLimitInfo;
exports.default = {
    handleValidationErrors: exports.handleValidationErrors,
    validators: exports.validators,
    sanitizeFields,
    rateLimitInfo: exports.rateLimitInfo,
};
//# sourceMappingURL=validation.js.map