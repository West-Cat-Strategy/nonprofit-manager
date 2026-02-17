/**
 * Prometheus Metrics Middleware
 * Collects and exposes application metrics for monitoring
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to collect request metrics
 */
export declare const metricsMiddleware: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Metrics router for /metrics endpoint
 */
export declare const metricsRouter: import("express-serve-static-core").Router;
export default metricsMiddleware;
//# sourceMappingURL=metrics.d.ts.map