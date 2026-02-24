/**
 * Analytics Authorization Middleware
 * Role-based access control for analytics endpoints
 */

import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';
import { logger } from '@config/logger';
import pool from '@config/database';
import { forbidden, unauthorized } from '@utils/responseHelpers';

/**
 * Analytics access levels by role
 * - admin: Full access to all analytics
 * - manager: Access to organizational analytics, limited financial details
 * - staff: Basic analytics, no financial details
 * - volunteer: No analytics access
 */
export const ANALYTICS_PERMISSIONS = {
  admin: {
    canViewOrgAnalytics: true,
    canViewAccountAnalytics: true,
    canViewContactAnalytics: true,
    canViewFinancialMetrics: true,
    canViewSensitiveData: true,
    canExportData: true,
    canViewAnomalies: true,
    canViewTrends: true,
  },
  manager: {
    canViewOrgAnalytics: true,
    canViewAccountAnalytics: true,
    canViewContactAnalytics: true,
    canViewFinancialMetrics: true, // Limited - amounts masked
    canViewSensitiveData: false,
    canExportData: true,
    canViewAnomalies: true,
    canViewTrends: true,
  },
  staff: {
    canViewOrgAnalytics: true,
    canViewAccountAnalytics: false,
    canViewContactAnalytics: false,
    canViewFinancialMetrics: false,
    canViewSensitiveData: false,
    canExportData: false,
    canViewAnomalies: false,
    canViewTrends: true,
  },
  // Default app users should have at least basic (non-financial) analytics access.
  user: {
    canViewOrgAnalytics: true,
    canViewAccountAnalytics: true,
    canViewContactAnalytics: true,
    canViewFinancialMetrics: false,
    canViewSensitiveData: false,
    canExportData: false,
    canViewAnomalies: false,
    canViewTrends: true,
  },
  readonly: {
    canViewOrgAnalytics: true,
    canViewAccountAnalytics: true,
    canViewContactAnalytics: true,
    canViewFinancialMetrics: false,
    canViewSensitiveData: false,
    canExportData: false,
    canViewAnomalies: false,
    canViewTrends: true,
  },
  volunteer: {
    canViewOrgAnalytics: false,
    canViewAccountAnalytics: false,
    canViewContactAnalytics: false,
    canViewFinancialMetrics: false,
    canViewSensitiveData: false,
    canExportData: false,
    canViewAnomalies: false,
    canViewTrends: false,
  },
} as const;

export type AnalyticsCapability = keyof typeof ANALYTICS_PERMISSIONS.admin;
export const ANALYTICS_CAPABILITIES = Object.keys(
  ANALYTICS_PERMISSIONS.admin
) as AnalyticsCapability[];

/**
 * Check if user has permission for analytics feature
 */
export function hasAnalyticsPermission(
  role: string,
  permission: AnalyticsCapability
): boolean {
  const rolePermissions = ANALYTICS_PERMISSIONS[role as keyof typeof ANALYTICS_PERMISSIONS];
  if (!rolePermissions) {
    return false;
  }
  return rolePermissions[permission] || false;
}

const hasAnalyticsPermissionForRoles = (
  primaryRole: string,
  permission: AnalyticsCapability,
  roles?: string[]
): boolean => {
  const candidates = roles && roles.length > 0 ? roles : [primaryRole];
  return candidates.some((role) => hasAnalyticsPermission(role, permission));
};

export function getAnalyticsCapabilityMatrix(
  role: string
): Record<AnalyticsCapability, boolean> {
  const matrix = {} as Record<AnalyticsCapability, boolean>;

  for (const capability of ANALYTICS_CAPABILITIES) {
    matrix[capability] = hasAnalyticsPermission(role, capability);
  }

  return matrix;
}

/**
 * Middleware to check organization-level analytics access
 */
export const requireOrgAnalytics = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.user) {
    return unauthorized(res, 'Unauthorized');
  }

  if (
    !hasAnalyticsPermissionForRoles(
      req.user.role,
      'canViewOrgAnalytics',
      req.authorizationContext?.roles
    )
  ) {
    logger.warn('Unauthorized analytics access attempt', {
      userId: req.user.id,
      role: req.user.role,
      endpoint: req.path,
    });
    return forbidden(res, 'Forbidden: Insufficient permissions for organizational analytics');
  }

  next();
};

/**
 * Middleware to check account-level analytics access
 */
export const requireAccountAnalytics = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.user) {
    return unauthorized(res, 'Unauthorized');
  }

  if (
    !hasAnalyticsPermissionForRoles(
      req.user.role,
      'canViewAccountAnalytics',
      req.authorizationContext?.roles
    )
  ) {
    logger.warn('Unauthorized account analytics access attempt', {
      userId: req.user.id,
      role: req.user.role,
      accountId: req.params.id,
    });
    return forbidden(res, 'Forbidden: Insufficient permissions for account analytics');
  }

  next();
};

/**
 * Middleware to check contact-level analytics access
 */
export const requireContactAnalytics = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.user) {
    return unauthorized(res, 'Unauthorized');
  }

  if (
    !hasAnalyticsPermissionForRoles(
      req.user.role,
      'canViewContactAnalytics',
      req.authorizationContext?.roles
    )
  ) {
    logger.warn('Unauthorized contact analytics access attempt', {
      userId: req.user.id,
      role: req.user.role,
      contactId: req.params.id,
    });
    return forbidden(res, 'Forbidden: Insufficient permissions for contact analytics');
  }

  next();
};

/**
 * Middleware to check data export permission
 */
export const requireExportPermission = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.user) {
    return unauthorized(res, 'Unauthorized');
  }

  if (
    !hasAnalyticsPermissionForRoles(
      req.user.role,
      'canExportData',
      req.authorizationContext?.roles
    )
  ) {
    logger.warn('Unauthorized data export attempt', {
      userId: req.user.id,
      role: req.user.role,
      endpoint: req.path,
    });
    return forbidden(res, 'Forbidden: Insufficient permissions for data export');
  }

  next();
};

/**
 * Middleware to check anomaly detection access
 */
export const requireAnomalyAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.user) {
    return unauthorized(res, 'Unauthorized');
  }

  if (
    !hasAnalyticsPermissionForRoles(
      req.user.role,
      'canViewAnomalies',
      req.authorizationContext?.roles
    )
  ) {
    logger.warn('Unauthorized anomaly detection access attempt', {
      userId: req.user.id,
      role: req.user.role,
    });
    return forbidden(res, 'Forbidden: Insufficient permissions for anomaly detection');
  }

  next();
};

/**
 * Audit log analytics data access
 */
export async function auditAnalyticsAccess(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    logger.error('Failed to create audit log', { error, userId, action });
    // Don't throw - audit failure shouldn't block the request
  }
}

/**
 * Middleware to audit analytics access
 */
export const auditAnalyticsMiddleware = (action: string) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    // Log the access attempt
    if (req.user) {
      await auditAnalyticsAccess(
        req.user.id,
        action,
        'analytics',
        req.params.id || null,
        {
          endpoint: req.path,
          method: req.method,
          query: req.query,
          params: req.params,
        }
      );
    }
    next();
  };
};

/**
 * Mask sensitive financial data based on user role
 */
export function maskFinancialData<T>(data: T, userRole: string): T {
  // Admin can see all data unchanged
  if (userRole === 'admin') {
    return data;
  }

  // Arrays (trends, lists) must preserve array shape.
  if (Array.isArray(data)) {
    const masked = data.map((item) => maskFinancialData(item, userRole));
    return masked as any as T;
  }

  // Non-objects can't contain financial fields
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  // Manager sees rounded amounts (no cents)
  if (userRole === 'manager') {
    return maskAmountsToNearest(data as any) as any as T;
  }

  // Staff and below see ranges instead of exact amounts
  return maskAmountsToRanges(data as any) as any as T;
}

/**
 * Round amounts to nearest dollar (remove cents)
 */
function maskAmountsToNearest(data: any): any {
  if (Array.isArray(data)) {
    return data.map((item) => maskAmountsToNearest(item));
  }

  const masked = { ...data } as any;

  // Recursively mask amount fields
  for (const key in masked) {
    if (typeof masked[key] === 'number' && (key.includes('amount') || key.includes('donation'))) {
      masked[key] = Math.round(masked[key]);
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskAmountsToNearest(masked[key]);
    }
  }

  return masked;
}

/**
 * Convert amounts to ranges for privacy
 */
function maskAmountsToRanges(data: any): any {
  if (Array.isArray(data)) {
    return data.map((item) => maskAmountsToRanges(item));
  }

  const masked = { ...data } as any;

  for (const key in masked) {
    if (typeof masked[key] === 'number' && (key.includes('amount') || key.includes('donation'))) {
      masked[key] = getAmountRange(masked[key]);
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskAmountsToRanges(masked[key]);
    }
  }

  return masked;
}

/**
 * Convert exact amount to range string
 */
function getAmountRange(amount: number): string {
  if (amount === 0) return '$0';
  if (amount < 100) return '$1-$99';
  if (amount < 500) return '$100-$499';
  if (amount < 1000) return '$500-$999';
  if (amount < 5000) return '$1,000-$4,999';
  if (amount < 10000) return '$5,000-$9,999';
  if (amount < 50000) return '$10,000-$49,999';
  return '$50,000+';
}

export default {
  hasAnalyticsPermission,
  requireOrgAnalytics,
  requireAccountAnalytics,
  requireContactAnalytics,
  requireExportPermission,
  requireAnomalyAccess,
  auditAnalyticsAccess,
  auditAnalyticsMiddleware,
  maskFinancialData,
};
