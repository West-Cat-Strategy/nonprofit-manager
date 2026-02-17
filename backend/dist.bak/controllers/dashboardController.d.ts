/**
 * Dashboard Controller
 * HTTP request handlers for dashboard configuration
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/dashboard/configs
 * Get all dashboard configurations for current user
 */
export declare const getDashboards: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/dashboard/configs/:id
 * Get a specific dashboard configuration
 */
export declare const getDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/dashboard/configs/default
 * Get user's default dashboard
 */
export declare const getDefaultDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/dashboard/configs
 * Create a new dashboard configuration
 */
export declare const createDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/dashboard/configs/:id
 * Update dashboard configuration
 */
export declare const updateDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/dashboard/configs/:id/layout
 * Update only the layout of a dashboard
 */
export declare const updateDashboardLayout: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/dashboard/configs/:id
 * Delete dashboard configuration
 */
export declare const deleteDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    getDashboards: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getDefaultDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    createDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    updateDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    updateDashboardLayout: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteDashboard: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=dashboardController.d.ts.map