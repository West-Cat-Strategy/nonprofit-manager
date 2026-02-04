/**
 * Request Validation Middleware
 * Handles express-validator results consistently
 */
import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
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
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => void;
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
export declare const validate: (validations: ValidationChain[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Common validation rules that can be reused across controllers
 */
export declare const commonValidations: {
    /**
     * Validate UUID format
     */
    uuid: (field: string, message?: string) => {
        field: string;
        options: {
            isUUID: {
                version: 4;
            };
        };
        message: string;
    };
    /**
     * Validate required string
     */
    requiredString: (field: string, message?: string) => {
        field: string;
        options: {
            notEmpty: boolean;
            isString: boolean;
        };
        message: string;
    };
    /**
     * Validate optional string
     */
    optionalString: (field: string) => {
        field: string;
        options: {
            optional: {
                options: {
                    nullable: boolean;
                };
            };
            isString: boolean;
        };
    };
    /**
     * Validate email
     */
    email: (field?: string, message?: string) => {
        field: string;
        options: {
            isEmail: boolean;
            normalizeEmail: boolean;
        };
        message: string;
    };
    /**
     * Validate positive integer
     */
    positiveInt: (field: string, message?: string) => {
        field: string;
        options: {
            isInt: {
                min: number;
            };
        };
        message: string;
    };
};
export default validateRequest;
//# sourceMappingURL=validateRequest.d.ts.map