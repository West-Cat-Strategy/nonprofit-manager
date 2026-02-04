/**
 * Alert Controller
 * HTTP request handlers for alert configuration
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/alerts/configs
 * Get all alert configurations for current user
 */
export declare const getAlertConfigs: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/alerts/configs/:id
 * Get a specific alert configuration
 */
export declare const getAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/alerts/configs
 * Create a new alert configuration
 */
export declare const createAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/alerts/configs/:id
 * Update alert configuration
 */
export declare const updateAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/alerts/configs/:id
 * Delete alert configuration
 */
export declare const deleteAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PATCH /api/alerts/configs/:id/toggle
 * Toggle alert enabled status
 */
export declare const toggleAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/alerts/test
 * Test alert configuration without saving
 */
export declare const testAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/alerts/instances
 * Get alert instances (triggered alerts)
 */
export declare const getAlertInstances: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PATCH /api/alerts/instances/:id/acknowledge
 * Acknowledge an alert instance
 */
export declare const acknowledgeAlert: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PATCH /api/alerts/instances/:id/resolve
 * Resolve an alert instance
 */
export declare const resolveAlert: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/alerts/stats
 * Get alert statistics for current user
 */
export declare const getAlertStats: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    getAlertConfigs: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    createAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    updateAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    toggleAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    testAlertConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getAlertInstances: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    acknowledgeAlert: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    resolveAlert: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getAlertStats: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=alertController.d.ts.map