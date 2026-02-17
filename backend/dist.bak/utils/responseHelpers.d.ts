/**
 * Response Helpers
 * Standardized HTTP response utilities for controllers
 */
import { Response } from 'express';
/**
 * Send a 404 Not Found response
 */
export declare const notFound: (res: Response, entity?: string) => void;
/**
 * Send a 409 Conflict response
 */
export declare const conflict: (res: Response, message: string) => void;
/**
 * Send a 400 Bad Request response
 */
export declare const badRequest: (res: Response, message: string) => void;
/**
 * Send a 401 Unauthorized response
 */
export declare const unauthorized: (res: Response, message?: string) => void;
/**
 * Send a 403 Forbidden response
 */
export declare const forbidden: (res: Response, message?: string) => void;
/**
 * Send a 422 Unprocessable Entity response (validation errors)
 */
export declare const validationError: (res: Response, errors: Record<string, string> | string[]) => void;
/**
 * Send a 500 Internal Server Error response
 */
export declare const serverError: (res: Response, message?: string) => void;
/**
 * Send a 201 Created response with data
 */
export declare const created: <T>(res: Response, data: T) => void;
/**
 * Send a 204 No Content response
 */
export declare const noContent: (res: Response) => void;
/**
 * Send a successful response with pagination metadata
 */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export declare const paginated: <T>(res: Response, data: T[], page: number, limit: number, total: number) => void;
//# sourceMappingURL=responseHelpers.d.ts.map