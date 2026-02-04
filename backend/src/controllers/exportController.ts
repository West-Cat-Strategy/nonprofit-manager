/**
 * Export Controller
 * HTTP handlers for analytics export endpoints
 */

import { Response, NextFunction } from 'express';
import { ExportService } from '../services/exportService';
import { AnalyticsService } from '../services/analyticsService';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import type { ExportFormat } from '../services/exportService';
import { logger } from '../config/logger';
import type { DataScopeFilter } from '../types/dataScope';

const exportService = new ExportService();
const analyticsService = new AnalyticsService(pool);

const denyIfScopedExport = (scope: DataScopeFilter | undefined, res: Response): boolean => {
  if (!scope) return false;
  const hasScope =
    (scope.accountIds && scope.accountIds.length > 0) ||
    (scope.contactIds && scope.contactIds.length > 0) ||
    (scope.createdByUserIds && scope.createdByUserIds.length > 0);
  if (hasScope) {
    res.status(403).json({ error: 'Scoped access does not allow exports yet' });
    return true;
  }
  return false;
};

/**
 * POST /api/export/analytics-summary
 * Export analytics summary
 */
export const exportAnalyticsSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedExport(scope, res)) {
      return;
    }
    const format: ExportFormat = req.body.format || 'csv';
    const filters = {
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      donor_type: req.body.donor_type,
      payment_method: req.body.payment_method,
    };

    // Get analytics data
    const summary = await analyticsService.getAnalyticsSummary(filters);

    // Export to file
    const filepath = await exportService.exportAnalyticsSummary(summary, {
      format,
      filename: req.body.filename,
      sheetName: 'Analytics Summary',
    });

    // Send file
    res.download(filepath, (err) => {
      if (err) {
        logger.error('Error sending export file', { error: err, filepath });
      }
      // Clean up file after sending
      setTimeout(() => exportService.deleteExport(filepath), 5000);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/export/donations
 * Export donation data
 */
export const exportDonations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedExport(scope, res)) {
      return;
    }
    const format: ExportFormat = req.body.format || 'csv';
    const filters = {
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      donor_id: req.body.donor_id,
      payment_method: req.body.payment_method,
      min_amount: req.body.min_amount,
      max_amount: req.body.max_amount,
    };

    // Build query
    let query = `
      SELECT
        d.id,
        d.donation_date,
        d.amount,
        d.payment_method,
        d.campaign,
        d.notes,
        COALESCE(don.name, don.organization_name) as donor_name
      FROM donations d
      LEFT JOIN donors don ON d.donor_id = don.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (filters.start_date) {
      query += ` AND d.donation_date >= $${paramCount++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND d.donation_date <= $${paramCount++}`;
      params.push(filters.end_date);
    }

    if (filters.donor_id) {
      query += ` AND d.donor_id = $${paramCount++}`;
      params.push(filters.donor_id);
    }

    if (filters.payment_method) {
      query += ` AND d.payment_method = $${paramCount++}`;
      params.push(filters.payment_method);
    }

    if (filters.min_amount) {
      query += ` AND d.amount >= $${paramCount++}`;
      params.push(filters.min_amount);
    }

    if (filters.max_amount) {
      query += ` AND d.amount <= $${paramCount++}`;
      params.push(filters.max_amount);
    }

    query += ` ORDER BY d.donation_date DESC`;

    const result = await pool.query(query, params);

    // Export to file
    const filepath = await exportService.exportDonationAnalytics(result.rows, {
      format,
      filename: req.body.filename,
      sheetName: 'Donations',
    });

    // Send file
    res.download(filepath, (err) => {
      if (err) {
        logger.error('Error sending export file', { error: err, filepath });
      }
      setTimeout(() => exportService.deleteExport(filepath), 5000);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/export/volunteer-hours
 * Export volunteer hours data
 */
export const exportVolunteerHours = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedExport(scope, res)) {
      return;
    }
    const format: ExportFormat = req.body.format || 'csv';
    const filters = {
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      volunteer_id: req.body.volunteer_id,
      activity_type: req.body.activity_type,
    };

    // Build query
    let query = `
      SELECT
        vh.id,
        vh.log_date,
        vh.hours,
        vh.activity_type,
        vh.description,
        v.first_name || ' ' || v.last_name as volunteer_name
      FROM volunteer_hours vh
      JOIN volunteers v ON vh.volunteer_id = v.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (filters.start_date) {
      query += ` AND vh.log_date >= $${paramCount++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND vh.log_date <= $${paramCount++}`;
      params.push(filters.end_date);
    }

    if (filters.volunteer_id) {
      query += ` AND vh.volunteer_id = $${paramCount++}`;
      params.push(filters.volunteer_id);
    }

    if (filters.activity_type) {
      query += ` AND vh.activity_type = $${paramCount++}`;
      params.push(filters.activity_type);
    }

    query += ` ORDER BY vh.log_date DESC`;

    const result = await pool.query(query, params);

    // Export to file
    const filepath = await exportService.exportVolunteerHours(result.rows, {
      format,
      filename: req.body.filename,
      sheetName: 'Volunteer Hours',
    });

    // Send file
    res.download(filepath, (err) => {
      if (err) {
        logger.error('Error sending export file', { error: err, filepath });
      }
      setTimeout(() => exportService.deleteExport(filepath), 5000);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/export/events
 * Export event attendance data
 */
export const exportEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedExport(scope, res)) {
      return;
    }
    const format: ExportFormat = req.body.format || 'csv';
    const filters = {
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      event_type: req.body.event_type,
      status: req.body.status,
    };

    // Build query
    let query = `
      SELECT
        e.id,
        e.name as event_name,
        e.start_date,
        e.event_type,
        e.status,
        COUNT(DISTINCT er.id) FILTER (WHERE er.status != 'cancelled') as registered_count,
        COUNT(DISTINCT er.id) FILTER (WHERE er.status = 'attended') as attended_count
      FROM events e
      LEFT JOIN event_registrations er ON e.id = er.event_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (filters.start_date) {
      query += ` AND e.start_date >= $${paramCount++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND e.start_date <= $${paramCount++}`;
      params.push(filters.end_date);
    }

    if (filters.event_type) {
      query += ` AND e.event_type = $${paramCount++}`;
      params.push(filters.event_type);
    }

    if (filters.status) {
      query += ` AND e.status = $${paramCount++}`;
      params.push(filters.status);
    }

    query += ` GROUP BY e.id, e.name, e.start_date, e.event_type, e.status`;
    query += ` ORDER BY e.start_date DESC`;

    const result = await pool.query(query, params);

    // Export to file
    const filepath = await exportService.exportEventAttendance(result.rows, {
      format,
      filename: req.body.filename,
      sheetName: 'Events',
    });

    // Send file
    res.download(filepath, (err) => {
      if (err) {
        logger.error('Error sending export file', { error: err, filepath });
      }
      setTimeout(() => exportService.deleteExport(filepath), 5000);
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/export/comprehensive
 * Export comprehensive report with multiple sheets
 */
export const exportComprehensive = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (denyIfScopedExport(scope, res)) {
      return;
    }
    const format: ExportFormat = req.body.format || 'excel'; // Excel recommended for multi-sheet
    const filters = {
      start_date: req.body.start_date,
      end_date: req.body.end_date,
    };

    // Get all data
    const [summary, donations, volunteerHours, events] = await Promise.all([
      analyticsService.getAnalyticsSummary(filters),
      pool.query(
        `SELECT
          d.donation_date,
          d.amount,
          d.payment_method,
          COALESCE(don.name, don.organization_name) as donor_name
        FROM donations d
        LEFT JOIN donors don ON d.donor_id = don.id
        WHERE d.donation_date >= $1 AND d.donation_date <= $2
        ORDER BY d.donation_date DESC
        LIMIT 1000`,
        [filters.start_date, filters.end_date]
      ),
      pool.query(
        `SELECT
          vh.log_date,
          vh.hours,
          vh.activity_type,
          v.first_name || ' ' || v.last_name as volunteer_name
        FROM volunteer_hours vh
        JOIN volunteers v ON vh.volunteer_id = v.id
        WHERE vh.log_date >= $1 AND vh.log_date <= $2
        ORDER BY vh.log_date DESC
        LIMIT 1000`,
        [filters.start_date, filters.end_date]
      ),
      pool.query(
        `SELECT
          e.name as event_name,
          e.start_date,
          e.event_type,
          COUNT(DISTINCT er.id) FILTER (WHERE er.status != 'cancelled') as registered_count,
          COUNT(DISTINCT er.id) FILTER (WHERE er.status = 'attended') as attended_count
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.event_id
        WHERE e.start_date >= $1 AND e.start_date <= $2
        GROUP BY e.id, e.name, e.start_date, e.event_type
        ORDER BY e.start_date DESC`,
        [filters.start_date, filters.end_date]
      ),
    ]);

    // Prepare summary sheet
    const summaryData = [
      {
        metric: 'Total Donations YTD',
        value: summary.donation_count_ytd,
        amount: summary.total_donations_ytd,
      },
      {
        metric: 'Average Donation YTD',
        value: '-',
        amount: summary.average_donation_ytd,
      },
      {
        metric: 'Total Accounts',
        value: summary.total_accounts,
        amount: '-',
      },
      {
        metric: 'Active Accounts',
        value: summary.active_accounts,
        amount: '-',
      },
      {
        metric: 'Total Contacts',
        value: summary.total_contacts,
        amount: '-',
      },
      {
        metric: 'Active Contacts',
        value: summary.active_contacts,
        amount: '-',
      },
      {
        metric: 'Total Volunteers',
        value: summary.total_volunteers,
        amount: '-',
      },
      {
        metric: 'Volunteer Hours YTD',
        value: summary.total_volunteer_hours_ytd,
        amount: '-',
      },
      {
        metric: 'Total Events YTD',
        value: summary.total_events_ytd,
        amount: '-',
      },
    ];

    // Export to file with multiple sheets
    const sheets = [
      { name: 'Summary', data: summaryData },
      { name: 'Donations', data: donations.rows },
      { name: 'Volunteer Hours', data: volunteerHours.rows },
      { name: 'Events', data: events.rows },
    ];

    const filepath = await exportService.exportMultiSheet(sheets, {
      format,
      filename: req.body.filename || `comprehensive-report-${Date.now()}`,
    });

    // Send file
    res.download(filepath, (err) => {
      if (err) {
        logger.error('Error sending export file', { error: err, filepath });
      }
      setTimeout(() => exportService.deleteExport(filepath), 5000);
    });
  } catch (error) {
    next(error);
  }
};

export default {
  exportAnalyticsSummary,
  exportDonations,
  exportVolunteerHours,
  exportEvents,
  exportComprehensive,
};
