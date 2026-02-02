/**
 * Analytics Authorization Middleware
 * Role-based access control for analytics endpoints
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { logger } from '../config/logger';
import pool from '../config/database';

/**
 * Analytics access levels by role
 * - admin: Full access to all analytics
 * - manager: Access to organizational analytics, limited financial details
 * - staff: Basic analytics, no financial details
 * - volunteer: No analytics access
 */
const ANALYTICS_PERMISSIONS = {
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
};

/**
 * Check if user has permission for analytics feature
 */
export function hasAnalyticsPermission(
  role: string,
  permission: keyof typeof ANALYTICS_PERMISSIONS.admin
): boolean {
  const rolePermissions = ANALYTICS_PERMISSIONS[role as keyof typeof ANALYTICS_PERMISSIONS];
  if (!rolePermissions) {
    return false;
  }
  return rolePermissions[permission] || false;
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!hasAnalyticsPermission(req.user.role, 'canViewOrgAnalytics')) {
    logger.warn('Unauthorized analytics access attempt', {
      userId: req.user.id,
      role: req.user.role,
      endpoint: req.path,
    });
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions for organizational analytics' });
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!hasAnalyticsPermission(req.user.role, 'canViewAccountAnalytics')) {
    logger.warn('Unauthorized account analytics access attempt', {
      userId: req.user.id,
      role: req.user.role,
      accountId: req.params.id,
    });
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions for account analytics' });
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!hasAnalyticsPermission(req.user.role, 'canViewContactAnalytics')) {
    logger.warn('Unauthorized contact analytics access attempt', {
      userId: req.user.id,
      role: req.user.role,
      contactId: req.params.id,
    });
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions for contact analytics' });
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!hasAnalyticsPermission(req.user.role, 'canExportData')) {
    logger.warn('Unauthorized data export attempt', {
      userId: req.user.id,
      role: req.user.role,
      endpoint: req.path,
    });
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions for data export' });
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!hasAnalyticsPermission(req.user.role, 'canViewAnomalies')) {
    logger.warn('Unauthorized anomaly detection access attempt', {
      userId: req.user.id,
      role: req.user.role,
    });
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions for anomaly detection' });
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
export function maskFinancialData<T extends Record<string, any>>(
  data: T,
  userRole: string
): T {
  // Admin and manager can see all data
  if (userRole === 'admin') {
    return data;
  }

  // Manager sees rounded amounts (no cents)
  if (userRole === 'manager') {
    return maskAmountsToNearest(data);
  }

  // Staff and below see ranges instead of exact amounts
  return maskAmountsToRanges(data);
}

/**
 * Round amounts to nearest dollar (remove cents)
 */
function maskAmountsToNearest<T extends Record<string, any>>(data: T): T {
  const masked = { ...data } as any;

  // Recursively mask amount fields
  for (const key in masked) {
    if (typeof masked[key] === 'number' && (key.includes('amount') || key.includes('donation'))) {
      masked[key] = Math.round(masked[key]);
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskAmountsToNearest(masked[key]);
    }
  }

  return masked as T;
}

/**
 * Convert amounts to ranges for privacy
 */
function maskAmountsToRanges<T extends Record<string, any>>(data: T): T {
  const masked = { ...data } as any;

  for (const key in masked) {
    if (typeof masked[key] === 'number' && (key.includes('amount') || key.includes('donation'))) {
      masked[key] = getAmountRange(masked[key]);
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskAmountsToRanges(masked[key]);
    }
  }

  return masked as T;
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
