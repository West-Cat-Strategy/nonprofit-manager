/**
 * Saved Report Controller
 * Handles HTTP requests for saved report management
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/saved-reports
 * Get all saved reports for current user
 */
export declare const getSavedReports: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/saved-reports/:id
 * Get a specific saved report by ID
 */
export declare const getSavedReportById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/saved-reports
 * Create a new saved report
 */
export declare const createSavedReport: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/saved-reports/:id
 * Update an existing saved report
 */
export declare const updateSavedReport: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/saved-reports/:id
 * Delete a saved report
 */
export declare const deleteSavedReport: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    getSavedReports: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getSavedReportById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    createSavedReport: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    updateSavedReport: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteSavedReport: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=savedReportController.d.ts.map