"use strict";
/**
 * Analytics Authorization Middleware
 * Role-based access control for analytics endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditAnalyticsMiddleware = exports.requireAnomalyAccess = exports.requireExportPermission = exports.requireContactAnalytics = exports.requireAccountAnalytics = exports.requireOrgAnalytics = void 0;
exports.hasAnalyticsPermission = hasAnalyticsPermission;
exports.auditAnalyticsAccess = auditAnalyticsAccess;
exports.maskFinancialData = maskFinancialData;
const logger_1 = require("../config/logger");
const database_1 = __importDefault(require("../config/database"));
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
};
/**
 * Check if user has permission for analytics feature
 */
function hasAnalyticsPermission(role, permission) {
    const rolePermissions = ANALYTICS_PERMISSIONS[role];
    if (!rolePermissions) {
        return false;
    }
    return rolePermissions[permission] || false;
}
/**
 * Middleware to check organization-level analytics access
 */
const requireOrgAnalytics = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!hasAnalyticsPermission(req.user.role, 'canViewOrgAnalytics')) {
        logger_1.logger.warn('Unauthorized analytics access attempt', {
            userId: req.user.id,
            role: req.user.role,
            endpoint: req.path,
        });
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions for organizational analytics' });
    }
    next();
};
exports.requireOrgAnalytics = requireOrgAnalytics;
/**
 * Middleware to check account-level analytics access
 */
const requireAccountAnalytics = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!hasAnalyticsPermission(req.user.role, 'canViewAccountAnalytics')) {
        logger_1.logger.warn('Unauthorized account analytics access attempt', {
            userId: req.user.id,
            role: req.user.role,
            accountId: req.params.id,
        });
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions for account analytics' });
    }
    next();
};
exports.requireAccountAnalytics = requireAccountAnalytics;
/**
 * Middleware to check contact-level analytics access
 */
const requireContactAnalytics = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!hasAnalyticsPermission(req.user.role, 'canViewContactAnalytics')) {
        logger_1.logger.warn('Unauthorized contact analytics access attempt', {
            userId: req.user.id,
            role: req.user.role,
            contactId: req.params.id,
        });
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions for contact analytics' });
    }
    next();
};
exports.requireContactAnalytics = requireContactAnalytics;
/**
 * Middleware to check data export permission
 */
const requireExportPermission = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!hasAnalyticsPermission(req.user.role, 'canExportData')) {
        logger_1.logger.warn('Unauthorized data export attempt', {
            userId: req.user.id,
            role: req.user.role,
            endpoint: req.path,
        });
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions for data export' });
    }
    next();
};
exports.requireExportPermission = requireExportPermission;
/**
 * Middleware to check anomaly detection access
 */
const requireAnomalyAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!hasAnalyticsPermission(req.user.role, 'canViewAnomalies')) {
        logger_1.logger.warn('Unauthorized anomaly detection access attempt', {
            userId: req.user.id,
            role: req.user.role,
        });
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions for anomaly detection' });
    }
    next();
};
exports.requireAnomalyAccess = requireAnomalyAccess;
/**
 * Audit log analytics data access
 */
async function auditAnalyticsAccess(userId, action, entityType, entityId, details) {
    try {
        await database_1.default.query(`INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`, [userId, action, entityType, entityId, JSON.stringify(details)]);
    }
    catch (error) {
        logger_1.logger.error('Failed to create audit log', { error, userId, action });
        // Don't throw - audit failure shouldn't block the request
    }
}
/**
 * Middleware to audit analytics access
 */
const auditAnalyticsMiddleware = (action) => {
    return async (req, _res, next) => {
        // Log the access attempt
        if (req.user) {
            await auditAnalyticsAccess(req.user.id, action, 'analytics', req.params.id || null, {
                endpoint: req.path,
                method: req.method,
                query: req.query,
                params: req.params,
            });
        }
        next();
    };
};
exports.auditAnalyticsMiddleware = auditAnalyticsMiddleware;
/**
 * Mask sensitive financial data based on user role
 */
function maskFinancialData(data, userRole) {
    // Admin can see all data unchanged
    if (userRole === 'admin') {
        return data;
    }
    // Arrays (trends, lists) must preserve array shape.
    if (Array.isArray(data)) {
        const masked = data.map((item) => maskFinancialData(item, userRole));
        return masked;
    }
    // Non-objects can't contain financial fields
    if (data === null || data === undefined || typeof data !== 'object') {
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
function maskAmountsToNearest(data) {
    if (Array.isArray(data)) {
        return data.map((item) => maskAmountsToNearest(item));
    }
    const masked = { ...data };
    // Recursively mask amount fields
    for (const key in masked) {
        if (typeof masked[key] === 'number' && (key.includes('amount') || key.includes('donation'))) {
            masked[key] = Math.round(masked[key]);
        }
        else if (typeof masked[key] === 'object' && masked[key] !== null) {
            masked[key] = maskAmountsToNearest(masked[key]);
        }
    }
    return masked;
}
/**
 * Convert amounts to ranges for privacy
 */
function maskAmountsToRanges(data) {
    if (Array.isArray(data)) {
        return data.map((item) => maskAmountsToRanges(item));
    }
    const masked = { ...data };
    for (const key in masked) {
        if (typeof masked[key] === 'number' && (key.includes('amount') || key.includes('donation'))) {
            masked[key] = getAmountRange(masked[key]);
        }
        else if (typeof masked[key] === 'object' && masked[key] !== null) {
            masked[key] = maskAmountsToRanges(masked[key]);
        }
    }
    return masked;
}
/**
 * Convert exact amount to range string
 */
function getAmountRange(amount) {
    if (amount === 0)
        return '$0';
    if (amount < 100)
        return '$1-$99';
    if (amount < 500)
        return '$100-$499';
    if (amount < 1000)
        return '$500-$999';
    if (amount < 5000)
        return '$1,000-$4,999';
    if (amount < 10000)
        return '$5,000-$9,999';
    if (amount < 50000)
        return '$10,000-$49,999';
    return '$50,000+';
}
exports.default = {
    hasAnalyticsPermission,
    requireOrgAnalytics: exports.requireOrgAnalytics,
    requireAccountAnalytics: exports.requireAccountAnalytics,
    requireContactAnalytics: exports.requireContactAnalytics,
    requireExportPermission: exports.requireExportPermission,
    requireAnomalyAccess: exports.requireAnomalyAccess,
    auditAnalyticsAccess,
    auditAnalyticsMiddleware: exports.auditAnalyticsMiddleware,
    maskFinancialData,
};
//# sourceMappingURL=analyticsAuth.js.map