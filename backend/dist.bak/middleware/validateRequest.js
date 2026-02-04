"use strict";
/**
 * Request Validation Middleware
 * Handles express-validator results consistently
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonValidations = exports.validate = exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
/**
 * Format validation errors into a consistent structure
 */
const formatValidationErrors = (errors) => {
    const formatted = {};
    for (const error of errors) {
        if (error.type === 'field') {
            // Only keep the first error for each field
            if (!formatted[error.path]) {
                formatted[error.path] = error.msg;
            }
        }
    }
    return formatted;
};
/**
 * Middleware to check validation results and return standardized error response
 * Use after express-validator validation chains
 *
 * @example
 * router.post('/users',
 *   body('email').isEmail().withMessage('Valid email is required'),
 *   body('name').notEmpty().withMessage('Name is required'),
 *   validateRequest,
 *   userController.createUser
 * );
 */
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(422).json({
            error: 'Validation failed',
            details: formatValidationErrors(errors.array()),
        });
        return;
    }
    next();
};
exports.validateRequest = validateRequest;
/**
 * Create a validation middleware chain with automatic error handling
 * Combines validation chains with the validateRequest middleware
 *
 * @example
 * router.post('/users', validate([
 *   body('email').isEmail().withMessage('Valid email is required'),
 *   body('name').notEmpty().withMessage('Name is required'),
 * ]), userController.createUser);
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(422).json({
                error: 'Validation failed',
                details: formatValidationErrors(errors.array()),
            });
            return;
        }
        next();
    };
};
exports.validate = validate;
/**
 * Common validation rules that can be reused across controllers
 */
exports.commonValidations = {
    /**
     * Validate UUID format
     */
    uuid: (field, message = 'Invalid UUID format') => ({
        field,
        options: {
            isUUID: { version: 4 },
        },
        message,
    }),
    /**
     * Validate required string
     */
    requiredString: (field, message = `${field} is required`) => ({
        field,
        options: {
            notEmpty: true,
            isString: true,
        },
        message,
    }),
    /**
     * Validate optional string
     */
    optionalString: (field) => ({
        field,
        options: {
            optional: { options: { nullable: true } },
            isString: true,
        },
    }),
    /**
     * Validate email
     */
    email: (field = 'email', message = 'Valid email is required') => ({
        field,
        options: {
            isEmail: true,
            normalizeEmail: true,
        },
        message,
    }),
    /**
     * Validate positive integer
     */
    positiveInt: (field, message = `${field} must be a positive integer`) => ({
        field,
        options: {
            isInt: { min: 1 },
        },
        message,
    }),
};
exports.default = exports.validateRequest;
//# sourceMappingURL=validateRequest.js.map