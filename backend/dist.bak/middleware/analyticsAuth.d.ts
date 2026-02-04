/**
 * Analytics Authorization Middleware
 * Role-based access control for analytics endpoints
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
/**
 * Analytics access levels by role
 * - admin: Full access to all analytics
 * - manager: Access to organizational analytics, limited financial details
 * - staff: Basic analytics, no financial details
 * - volunteer: No analytics access
 */
declare const ANALYTICS_PERMISSIONS: {
    admin: {
        canViewOrgAnalytics: boolean;
        canViewAccountAnalytics: boolean;
        canViewContactAnalytics: boolean;
        canViewFinancialMetrics: boolean;
        canViewSensitiveData: boolean;
        canExportData: boolean;
        canViewAnomalies: boolean;
        canViewTrends: boolean;
    };
    manager: {
        canViewOrgAnalytics: boolean;
        canViewAccountAnalytics: boolean;
        canViewContactAnalytics: boolean;
        canViewFinancialMetrics: boolean;
        canViewSensitiveData: boolean;
        canExportData: boolean;
        canViewAnomalies: boolean;
        canViewTrends: boolean;
    };
    staff: {
        canViewOrgAnalytics: boolean;
        canViewAccountAnalytics: boolean;
        canViewContactAnalytics: boolean;
        canViewFinancialMetrics: boolean;
        canViewSensitiveData: boolean;
        canExportData: boolean;
        canViewAnomalies: boolean;
        canViewTrends: boolean;
    };
    user: {
        canViewOrgAnalytics: boolean;
        canViewAccountAnalytics: boolean;
        canViewContactAnalytics: boolean;
        canViewFinancialMetrics: boolean;
        canViewSensitiveData: boolean;
        canExportData: boolean;
        canViewAnomalies: boolean;
        canViewTrends: boolean;
    };
    readonly: {
        canViewOrgAnalytics: boolean;
        canViewAccountAnalytics: boolean;
        canViewContactAnalytics: boolean;
        canViewFinancialMetrics: boolean;
        canViewSensitiveData: boolean;
        canExportData: boolean;
        canViewAnomalies: boolean;
        canViewTrends: boolean;
    };
    volunteer: {
        canViewOrgAnalytics: boolean;
        canViewAccountAnalytics: boolean;
        canViewContactAnalytics: boolean;
        canViewFinancialMetrics: boolean;
        canViewSensitiveData: boolean;
        canExportData: boolean;
        canViewAnomalies: boolean;
        canViewTrends: boolean;
    };
};
/**
 * Check if user has permission for analytics feature
 */
export declare function hasAnalyticsPermission(role: string, permission: keyof typeof ANALYTICS_PERMISSIONS.admin): boolean;
/**
 * Middleware to check organization-level analytics access
 */
export declare const requireOrgAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
/**
 * Middleware to check account-level analytics access
 */
export declare const requireAccountAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
/**
 * Middleware to check contact-level analytics access
 */
export declare const requireContactAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
/**
 * Middleware to check data export permission
 */
export declare const requireExportPermission: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
/**
 * Middleware to check anomaly detection access
 */
export declare const requireAnomalyAccess: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
/**
 * Audit log analytics data access
 */
export declare function auditAnalyticsAccess(userId: string, action: string, entityType: string, entityId: string | null, details: Record<string, unknown>): Promise<void>;
/**
 * Middleware to audit analytics access
 */
export declare const auditAnalyticsMiddleware: (action: string) => (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Mask sensitive financial data based on user role
 */
export declare function maskFinancialData<T>(data: T, userRole: string): T;
declare const _default: {
    hasAnalyticsPermission: typeof hasAnalyticsPermission;
    requireOrgAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
    requireAccountAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
    requireContactAnalytics: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
    requireExportPermission: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
    requireAnomalyAccess: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
    auditAnalyticsAccess: typeof auditAnalyticsAccess;
    auditAnalyticsMiddleware: (action: string) => (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
    maskFinancialData: typeof maskFinancialData;
};
export default _default;
//# sourceMappingURL=analyticsAuth.d.ts.map