/**
 * Export Controller
 * HTTP handlers for analytics export endpoints
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * POST /api/export/analytics-summary
 * Export analytics summary
 */
export declare const exportAnalyticsSummary: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/export/donations
 * Export donation data
 */
export declare const exportDonations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/export/volunteer-hours
 * Export volunteer hours data
 */
export declare const exportVolunteerHours: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/export/events
 * Export event attendance data
 */
export declare const exportEvents: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/export/comprehensive
 * Export comprehensive report with multiple sheets
 */
export declare const exportComprehensive: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    exportAnalyticsSummary: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    exportDonations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    exportVolunteerHours: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    exportEvents: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    exportComprehensive: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=exportController.d.ts.map