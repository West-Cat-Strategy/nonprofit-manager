/**
 * Correlation ID Middleware
 * Adds unique correlation IDs to requests for distributed tracing
 */
import { Request, Response, NextFunction } from 'express';
export declare const CORRELATION_ID_HEADER = "x-correlation-id";
/**
 * Middleware that adds a correlation ID to each request
 * - Uses existing header if provided (for distributed tracing)
 * - Generates a new UUID if not provided
 * - Adds correlation ID to response headers
 * - Attaches to request object for logging
 */
export declare const correlationIdMiddleware: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Helper to get correlation ID from request
 */
export declare const getCorrelationId: (req: Request) => string;
export default correlationIdMiddleware;
//# sourceMappingURL=correlationId.d.ts.map