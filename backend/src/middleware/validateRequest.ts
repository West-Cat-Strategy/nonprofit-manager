/**
 * Request Validation Middleware
 * Handles express-validator results consistently
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError, ValidationChain } from 'express-validator';

/**
 * Format validation errors into a consistent structure
 */
const formatValidationErrors = (errors: ValidationError[]): Record<string, string> => {
  const formatted: Record<string, string> = {};

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
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(422).json({
      error: 'Validation failed',
      details: formatValidationErrors(errors.array()),
    });
    return;
  }

  next();
};

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
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

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

/**
 * Common validation rules that can be reused across controllers
 */
export const commonValidations = {
  /**
   * Validate UUID format
   */
  uuid: (field: string, message: string = 'Invalid UUID format') => ({
    field,
    options: {
      isUUID: { version: 4 as const },
    },
    message,
  }),

  /**
   * Validate required string
   */
  requiredString: (field: string, message: string = `${field} is required`) => ({
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
  optionalString: (field: string) => ({
    field,
    options: {
      optional: { options: { nullable: true } },
      isString: true,
    },
  }),

  /**
   * Validate email
   */
  email: (field: string = 'email', message: string = 'Valid email is required') => ({
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
  positiveInt: (field: string, message: string = `${field} must be a positive integer`) => ({
    field,
    options: {
      isInt: { min: 1 },
    },
    message,
  }),
};

export default validateRequest;
