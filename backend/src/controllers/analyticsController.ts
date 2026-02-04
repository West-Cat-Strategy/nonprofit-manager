/**
 * Analytics Controller
 * Handles HTTP requests for constituent analytics
 */

import { Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import type { AnalyticsFilters } from '../types/analytics';
import { maskFinancialData } from '../middleware/analyticsAuth';
import type { DataScopeFilter } from '../types/dataScope';

const analyticsService = new AnalyticsService(pool);

const denyIfScopedForOrgWide = (
  scope: DataScopeFilter | undefined,
  res: Response
): boolean => {
  if (!scope) return false;
  const hasScope =
    (scope.accountIds && scope.accountIds.length > 0) ||
    (scope.contactIds && scope.contactIds.length > 0) ||
    (scope.createdByUserIds && scope.createdByUserIds.length > 0);
  if (hasScope) {
    res.status(403).json({ error: 'Scoped access does not allow organization-wide analytics' });
    return true;
  }
  return false;
};

const denyIfAccountOutOfScope = (
  scope: DataScopeFilter | undefined,
  accountId: string,
  res: Response
): boolean => {
  if (scope?.accountIds && scope.accountIds.length > 0 && !scope.accountIds.includes(accountId)) {
    res.status(404).json({ error: 'Account not found' });
    return true;
  }
  return false;
};

const denyIfContactOutOfScope = (
  scope: DataScopeFilter | undefined,
  contactId: string,
  res: Response
): boolean => {
  if (scope?.contactIds && scope.contactIds.length > 0 && !scope.contactIds.includes(contactId)) {
    res.status(404).json({ error: 'Contact not found' });
    return true;
  }
  return false;
};

/**
 * GET /api/analytics/accounts/:id
 * Get analytics for a specific account
 */
export const getAccountAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfAccountOutOfScope(scope, id, res)) {
      return;
    }
    const analytics = await analyticsService.getAccountAnalytics(id);
    const maskedAnalytics = maskFinancialData(analytics, req.user!.role);
    res.json(maskedAnalytics);
  } catch (error) {
    if ((error as Error).message === 'Account not found') {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/analytics/contacts/:id
 * Get analytics for a specific contact
 */
export const getContactAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfContactOutOfScope(scope, id, res)) {
      return;
    }
    const analytics = await analyticsService.getContactAnalytics(id);
    const maskedAnalytics = maskFinancialData(analytics, req.user!.role);
    res.json(maskedAnalytics);
  } catch (error) {
    if ((error as Error).message === 'Contact not found') {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/analytics/summary
 * Get organization-wide analytics summary
 */
export const getAnalyticsSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedForOrgWide(scope, res)) {
      return;
    }
    const filters: AnalyticsFilters = {
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      account_type: req.query.account_type as string | undefined,
      category: req.query.category as string | undefined,
    };

    const summary = await analyticsService.getAnalyticsSummary(filters);
    const maskedSummary = maskFinancialData(summary, req.user!.role);
    res.json(maskedSummary);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/accounts/:id/donations
 * Get donation metrics for a specific account
 */
export const getAccountDonationMetrics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfAccountOutOfScope(scope, id, res)) {
      return;
    }
    const metrics = await analyticsService.getDonationMetrics('account', id);
    const maskedMetrics = maskFinancialData(metrics, req.user!.role);
    res.json(maskedMetrics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/contacts/:id/donations
 * Get donation metrics for a specific contact
 */
export const getContactDonationMetrics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfContactOutOfScope(scope, id, res)) {
      return;
    }
    const metrics = await analyticsService.getDonationMetrics('contact', id);
    const maskedMetrics = maskFinancialData(metrics, req.user!.role);
    res.json(maskedMetrics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/accounts/:id/events
 * Get event metrics for a specific account
 */
export const getAccountEventMetrics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfAccountOutOfScope(scope, id, res)) {
      return;
    }
    const metrics = await analyticsService.getEventMetrics('account', id);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/contacts/:id/events
 * Get event metrics for a specific contact
 */
export const getContactEventMetrics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfContactOutOfScope(scope, id, res)) {
      return;
    }
    const metrics = await analyticsService.getEventMetrics('contact', id);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/contacts/:id/volunteer
 * Get volunteer metrics for a specific contact
 */
export const getContactVolunteerMetrics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfContactOutOfScope(scope, id, res)) {
      return;
    }
    const metrics = await analyticsService.getVolunteerMetrics(id);

    if (!metrics) {
      res.status(404).json({ error: 'Contact is not a volunteer' });
      return;
    }

    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/trends/donations
 * Get donation trends by month
 */
export const getDonationTrends = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedForOrgWide(scope, res)) {
      return;
    }
    const months = parseInt(req.query.months as string) || 12;
    const trends = await analyticsService.getDonationTrends(Math.min(months, 24));
    const maskedTrends = maskFinancialData(trends, req.user!.role);
    res.json(maskedTrends);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/trends/volunteer-hours
 * Get volunteer hours trends by month
 */
export const getVolunteerHoursTrends = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedForOrgWide(scope, res)) {
      return;
    }
    const months = parseInt(req.query.months as string) || 12;
    const trends = await analyticsService.getVolunteerHoursTrends(Math.min(months, 24));
    res.json(trends);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/trends/event-attendance
 * Get event attendance trends by month
 */
export const getEventAttendanceTrends = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedForOrgWide(scope, res)) {
      return;
    }
    const months = parseInt(req.query.months as string) || 12;
    const trends = await analyticsService.getEventAttendanceTrends(Math.min(months, 24));
    res.json(trends);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/comparative
 * Get comparative analytics (YoY, MoM, QoQ)
 */
export const getComparativeAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedForOrgWide(scope, res)) {
      return;
    }
    const periodType = (req.query.period as 'month' | 'quarter' | 'year') || 'month';

    // Validate period type
    if (!['month', 'quarter', 'year'].includes(periodType)) {
      res.status(400).json({ error: 'Invalid period type. Must be month, quarter, or year' });
      return;
    }

    const analytics = await analyticsService.getComparativeAnalytics(periodType);
    const maskedAnalytics = maskFinancialData(analytics, req.user!.role);
    res.json(maskedAnalytics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/trends/:metricType
 * Get trend analysis with moving averages for a metric
 */
export const getTrendAnalysis = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedForOrgWide(scope, res)) {
      return;
    }
    const { metricType } = req.params as { metricType: 'donations' | 'volunteer_hours' | 'event_attendance' };
    const months = parseInt(req.query.months as string) || 12;

    if (!['donations', 'volunteer_hours', 'event_attendance'].includes(metricType)) {
      res.status(400).json({ error: 'Invalid metric type. Must be donations, volunteer_hours, or event_attendance' });
      return;
    }

    if (months < 1 || months > 36) {
      res.status(400).json({ error: 'Months must be between 1 and 36' });
      return;
    }

    const analysis = await analyticsService.getTrendAnalysis(metricType, months);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/anomalies/:metricType
 * Detect anomalies in metric data using statistical methods
 */
export const detectAnomalies = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedForOrgWide(scope, res)) {
      return;
    }
    const { metricType } = req.params as { metricType: 'donations' | 'volunteer_hours' | 'event_attendance' };
    const months = parseInt(req.query.months as string) || 12;
    const sensitivity = parseFloat(req.query.sensitivity as string) || 2.0;

    if (!['donations', 'volunteer_hours', 'event_attendance'].includes(metricType)) {
      res.status(400).json({ error: 'Invalid metric type. Must be donations, volunteer_hours, or event_attendance' });
      return;
    }

    if (months < 3 || months > 36) {
      res.status(400).json({ error: 'Months must be between 3 and 36 for anomaly detection' });
      return;
    }

    if (sensitivity < 1.0 || sensitivity > 4.0) {
      res.status(400).json({ error: 'Sensitivity must be between 1.0 (very sensitive) and 4.0 (less sensitive)' });
      return;
    }

    const result = await analyticsService.detectAnomalies(metricType, months, sensitivity);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export default {
  getAccountAnalytics,
  getContactAnalytics,
  getAnalyticsSummary,
  getAccountDonationMetrics,
  getContactDonationMetrics,
  getAccountEventMetrics,
  getContactEventMetrics,
  getContactVolunteerMetrics,
  getDonationTrends,
  getVolunteerHoursTrends,
  getEventAttendanceTrends,
  getComparativeAnalytics,
  getTrendAnalysis,
  detectAnomalies,
};
