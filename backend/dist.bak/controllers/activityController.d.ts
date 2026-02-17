/**
 * Activity Controller
 * Handles activity feed requests
 */
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
/**
 * Get recent activities
 * GET /api/activities/recent
 */
export declare const getRecentActivities: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * Get activities for a specific entity
 * GET /api/activities/:entityType/:entityId
 */
export declare const getEntityActivities: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=activityController.d.ts.map