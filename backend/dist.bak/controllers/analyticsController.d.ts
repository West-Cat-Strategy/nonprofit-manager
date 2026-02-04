/**
 * Analytics Controller
 * Handles HTTP requests for constituent analytics
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/analytics/accounts/:id
 * Get analytics for a specific account
 */
export declare const getAccountAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/contacts/:id
 * Get analytics for a specific contact
 */
export declare const getContactAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/summary
 * Get organization-wide analytics summary
 */
export declare const getAnalyticsSummary: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/accounts/:id/donations
 * Get donation metrics for a specific account
 */
export declare const getAccountDonationMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/contacts/:id/donations
 * Get donation metrics for a specific contact
 */
export declare const getContactDonationMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/accounts/:id/events
 * Get event metrics for a specific account
 */
export declare const getAccountEventMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/contacts/:id/events
 * Get event metrics for a specific contact
 */
export declare const getContactEventMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/contacts/:id/volunteer
 * Get volunteer metrics for a specific contact
 */
export declare const getContactVolunteerMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/trends/donations
 * Get donation trends by month
 */
export declare const getDonationTrends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/trends/volunteer-hours
 * Get volunteer hours trends by month
 */
export declare const getVolunteerHoursTrends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/trends/event-attendance
 * Get event attendance trends by month
 */
export declare const getEventAttendanceTrends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/comparative
 * Get comparative analytics (YoY, MoM, QoQ)
 */
export declare const getComparativeAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/trends/:metricType
 * Get trend analysis with moving averages for a metric
 */
export declare const getTrendAnalysis: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/analytics/anomalies/:metricType
 * Detect anomalies in metric data using statistical methods
 */
export declare const detectAnomalies: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    getAccountAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getContactAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getAnalyticsSummary: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getAccountDonationMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getContactDonationMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getAccountEventMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getContactEventMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getContactVolunteerMetrics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getDonationTrends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getVolunteerHoursTrends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getEventAttendanceTrends: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getComparativeAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getTrendAnalysis: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    detectAnomalies: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=analyticsController.d.ts.map