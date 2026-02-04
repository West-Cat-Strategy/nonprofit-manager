/**
 * Report Controller
 * Handles HTTP requests for custom report generation
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * POST /api/reports/generate
 * Generate a custom report based on definition
 */
export declare const generateReport: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/reports/fields/:entity
 * Get available fields for an entity type
 */
export declare const getAvailableFields: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    generateReport: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getAvailableFields: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=reportController.d.ts.map