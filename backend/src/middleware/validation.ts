/**
 * Validation Middleware
 * Common validation patterns and sanitization utilities
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, body, param, query } from 'express-validator';
import { logger } from '../config/logger';
import { validationErrorResponse } from '../utils/responseHelpers';

/**
 * Middleware to check validation results
 * Use after express-validator validation chains
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      path: req.path,
      method: req.method,
      correlationId: req.correlationId,
    });

    validationErrorResponse(res, errors);
    return;
  }

  next();
};

/**
 * Common validation patterns
 */
export const validators = {
  // UUID validation
  uuid: (field: string, location: 'body' | 'param' | 'query' = 'param'): ValidationChain => {
    const validator = location === 'body' ? body(field) : location === 'param' ? param(field) : query(field);
    return validator.isUUID(4).withMessage(`${field} must be a valid UUID`);
  },

  // Email validation with sanitization
  email: (field = 'email', required = true): ValidationChain => {
    let validator = body(field).trim().normalizeEmail();
    if (required) {
      validator = validator.notEmpty().withMessage('Email is required');
    } else {
      validator = validator.optional({ nullable: true, checkFalsy: true });
    }
    return validator.isEmail().withMessage('Invalid email format');
  },

  // Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
  password: (field = 'password'): ValidationChain => {
    return body(field)
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number');
  },

  // Name validation (letters, spaces, hyphens, apostrophes)
  name: (field: string, required = true): ValidationChain => {
    let validator = body(field).trim();
    if (required) {
      validator = validator.notEmpty().withMessage(`${field} is required`);
    } else {
      validator = validator.optional({ nullable: true, checkFalsy: true });
    }
    return validator
      .isLength({ max: 100 }).withMessage(`${field} must be 100 characters or less`)
      .matches(/^[a-zA-Z\s'-]+$/).withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`);
  },

  // Phone validation
  phone: (field = 'phone'): ValidationChain => {
    return body(field)
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .matches(/^[\d\s\-+().ext]+$/).withMessage('Invalid phone number format')
      .isLength({ max: 30 }).withMessage('Phone number too long');
  },

  // URL validation
  url: (field: string): ValidationChain => {
    return body(field)
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isURL({ protocols: ['http', 'https'] }).withMessage('Invalid URL format');
  },

  // Date validation
  date: (field: string, required = false): ValidationChain => {
    let validator = body(field);
    if (required) {
      validator = validator.notEmpty().withMessage(`${field} is required`);
    } else {
      validator = validator.optional({ nullable: true, checkFalsy: true });
    }
    return validator.isISO8601().withMessage(`${field} must be a valid date`);
  },

  // Positive integer validation
  positiveInt: (field: string, location: 'body' | 'query' = 'body', required = true): ValidationChain => {
    const validator = location === 'body' ? body(field) : query(field);
    let chain = validator;
    if (required) {
      chain = chain.notEmpty().withMessage(`${field} is required`);
    } else {
      chain = chain.optional({ nullable: true, checkFalsy: true });
    }
    return chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer`);
  },

  // Amount validation (for currency - cents)
  amount: (field = 'amount'): ValidationChain => {
    return body(field)
      .notEmpty().withMessage('Amount is required')
      .isInt({ min: 1 }).withMessage('Amount must be a positive integer (in cents)');
  },

  // Text sanitization (prevent XSS)
  sanitizedText: (field: string, maxLength = 500, required = false): ValidationChain => {
    let validator = body(field).trim();
    if (required) {
      validator = validator.notEmpty().withMessage(`${field} is required`);
    } else {
      validator = validator.optional({ nullable: true, checkFalsy: true });
    }
    return validator
      .isLength({ max: maxLength }).withMessage(`${field} must be ${maxLength} characters or less`)
      .escape(); // Escape HTML entities
  },

  // Pagination
  pagination: (): ValidationChain[] => [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sort_by')
      .optional()
      .isString()
      .matches(/^[a-z_]+$/).withMessage('Invalid sort field'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  ],

  // Search query
  search: (): ValidationChain => {
    return query('search')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Search query too long')
      .escape();
  },
};

/**
 * Sanitize object keys (remove unexpected fields)
 */
export function sanitizeFields<T extends Record<string, unknown>>(
  data: Record<string, unknown>,
  allowedFields: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const field of allowedFields) {
    if (field in data) {
      sanitized[field] = data[field as string] as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Rate limit specific validation
 */
export const rateLimitInfo = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add rate limit headers info to response
  res.on('finish', () => {
    const remaining = res.getHeader('X-RateLimit-Remaining');
    if (remaining !== undefined && parseInt(remaining as string) <= 10) {
      logger.warn('Rate limit approaching', {
        remaining,
        ip: req.ip,
        path: req.path,
        correlationId: req.correlationId,
      });
    }
  });
  next();
};

export default {
  validateRequest,
  validators,
  sanitizeFields,
  rateLimitInfo,
};
