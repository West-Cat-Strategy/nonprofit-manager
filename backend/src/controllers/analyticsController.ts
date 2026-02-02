/**
 * Analytics Controller
 * Handles HTTP requests for constituent analytics
 */

import { Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import type { AnalyticsFilters } from '../types/analytics';

const analyticsService = new AnalyticsService(pool);

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
    const analytics = await analyticsService.getAccountAnalytics(id);
    res.json(analytics);
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
    const analytics = await analyticsService.getContactAnalytics(id);
    res.json(analytics);
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
    const filters: AnalyticsFilters = {
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      account_type: req.query.account_type as string | undefined,
      category: req.query.category as string | undefined,
    };

    const summary = await analyticsService.getAnalyticsSummary(filters);
    res.json(summary);
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
    const metrics = await analyticsService.getDonationMetrics('account', id);
    res.json(metrics);
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
    const metrics = await analyticsService.getDonationMetrics('contact', id);
    res.json(metrics);
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
    const months = parseInt(req.query.months as string) || 12;
    const trends = await analyticsService.getDonationTrends(Math.min(months, 24));
    res.json(trends);
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
    const periodType = (req.query.period as 'month' | 'quarter' | 'year') || 'month';
    
    // Validate period type
    if (!['month', 'quarter', 'year'].includes(periodType)) {
      res.status(400).json({ error: 'Invalid period type. Must be month, quarter, or year' });
      return;
    }
    
    const analytics = await analyticsService.getComparativeAnalytics(periodType);
    res.json(analytics);
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
};
