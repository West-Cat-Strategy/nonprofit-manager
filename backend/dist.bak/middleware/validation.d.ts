/**
 * Validation Middleware
 * Common validation patterns and sanitization utilities
 */
import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
/**
 * Middleware to check validation results
 * Use after express-validator validation chains
 */
export declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Common validation patterns
 */
export declare const validators: {
    uuid: (field: string, location?: "body" | "param" | "query") => ValidationChain;
    email: (field?: string, required?: boolean) => ValidationChain;
    password: (field?: string) => ValidationChain;
    name: (field: string, required?: boolean) => ValidationChain;
    phone: (field?: string) => ValidationChain;
    url: (field: string) => ValidationChain;
    date: (field: string, required?: boolean) => ValidationChain;
    positiveInt: (field: string, location?: "body" | "query", required?: boolean) => ValidationChain;
    amount: (field?: string) => ValidationChain;
    sanitizedText: (field: string, maxLength?: number, required?: boolean) => ValidationChain;
    pagination: () => ValidationChain[];
    search: () => ValidationChain;
};
/**
 * Sanitize object keys (remove unexpected fields)
 */
export declare function sanitizeFields<T extends Record<string, unknown>>(data: Record<string, unknown>, allowedFields: (keyof T)[]): Partial<T>;
/**
 * Rate limit specific validation
 */
export declare const rateLimitInfo: (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    handleValidationErrors: (req: Request, res: Response, next: NextFunction) => void;
    validators: {
        uuid: (field: string, location?: "body" | "param" | "query") => ValidationChain;
        email: (field?: string, required?: boolean) => ValidationChain;
        password: (field?: string) => ValidationChain;
        name: (field: string, required?: boolean) => ValidationChain;
        phone: (field?: string) => ValidationChain;
        url: (field: string) => ValidationChain;
        date: (field: string, required?: boolean) => ValidationChain;
        positiveInt: (field: string, location?: "body" | "query", required?: boolean) => ValidationChain;
        amount: (field?: string) => ValidationChain;
        sanitizedText: (field: string, maxLength?: number, required?: boolean) => ValidationChain;
        pagination: () => ValidationChain[];
        search: () => ValidationChain;
    };
    sanitizeFields: typeof sanitizeFields;
    rateLimitInfo: (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=validation.d.ts.map