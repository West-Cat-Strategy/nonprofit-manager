/**
 * Reconciliation Controller
 * HTTP handlers for payment reconciliation operations
 */

import { Request, Response } from 'express';
import { logger } from '../config/logger';
import * as reconciliationService from '../services/reconciliationService';
import type { AuthRequest } from '../middleware/auth';
import type {
  CreateReconciliationRequest,
  MatchTransactionRequest,
  ResolveDiscrepancyRequest,
  MatchStatus,
} from '../types/reconciliation';
import pool from '../config/database';
import { badRequest, notFoundMessage, serverError, serviceUnavailable } from '../utils/responseHelpers';

/**
 * Create a new payment reconciliation
 */
export const createReconciliation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = req.body as CreateReconciliationRequest;
    const userId = req.user?.id;

    // Validate date range
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);

    if (startDate >= endDate) {
      badRequest(res, 'Start date must be before end date');
      return;
    }

    if (endDate > new Date()) {
      badRequest(res, 'End date cannot be in the future');
      return;
    }

    // Check if Stripe is configured
    if (!reconciliationService.isStripeConfigured()) {
      serviceUnavailable(res, 'Stripe is not configured');
      return;
    }

    logger.info('Creating payment reconciliation', {
      userId,
      startDate,
      endDate,
      type: request.reconciliation_type,
    });

    const reconciliation = await reconciliationService.createReconciliation(request, userId);

    res.status(201).json(reconciliation);
  } catch (error) {
    logger.error('Error creating reconciliation:', error);
    serverError(res, 'Failed to create reconciliation');
  }
};

interface ReconciliationQueryParams {
  status?: string;
  reconciliation_type?: string;
  start_date?: string;
  end_date?: string;
  initiated_by?: string;
  page?: string;
  limit?: string;
}

interface ReconciliationItemsQueryParams {
  match_status?: string;
  page?: string;
  limit?: string;
}

interface DiscrepancyQueryParams {
  status?: string;
  severity?: string;
  discrepancy_type?: string;
  assigned_to?: string;
  reconciliation_id?: string;
  donation_id?: string;
  page?: string;
  limit?: string;
}

type QueryValue = string | number;

const validMatchStatuses: MatchStatus[] = ['matched', 'unmatched_stripe', 'unmatched_donation', 'amount_mismatch', 'date_mismatch'];

const parseMatchStatus = (value: string | undefined): MatchStatus | undefined => {
  if (!value) return undefined;
  return validMatchStatuses.includes(value as MatchStatus) ? (value as MatchStatus) : undefined;
};

/**
 * Get all reconciliations with filtering
 */
export const getReconciliations = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      reconciliation_type,
      start_date,
      end_date,
      initiated_by,
      page = '1',
      limit = '20',
    } = req.query as ReconciliationQueryParams;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20)); // Enforce max limit
    const offset = (pageNum - 1) * limitNum;

    // Build query with parameterized values
    let query = 'SELECT * FROM payment_reconciliations WHERE 1=1';
    const params: QueryValue[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (reconciliation_type) {
      query += ` AND reconciliation_type = $${paramIndex++}`;
      params.push(reconciliation_type);
    }

    if (start_date) {
      query += ` AND start_date >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND end_date <= $${paramIndex++}`;
      params.push(end_date);
    }

    if (initiated_by) {
      query += ` AND initiated_by = $${paramIndex++}`;
      params.push(initiated_by);
    }

    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS count_query`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    res.json({
      reconciliations: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching reconciliations:', error);
    serverError(res, 'Failed to fetch reconciliations');
  }
};

/**
 * Get reconciliation by ID
 */
export const getReconciliationById = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const reconciliation = await reconciliationService.getReconciliationById(id);
    const summary = await reconciliationService.getReconciliationSummary(id);

    res.json({
      reconciliation,
      summary,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Reconciliation not found') {
      notFoundMessage(res, 'Reconciliation not found');
      return;
    }
    logger.error('Error fetching reconciliation:', error);
    serverError(res, 'Failed to fetch reconciliation');
  }
};

/**
 * Get reconciliation items
 */
export const getReconciliationItems = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { match_status, page = '1', limit = '50' } = req.query as ReconciliationItemsQueryParams;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const items = await reconciliationService.getReconciliationItems(id, parseMatchStatus(match_status));

    // Apply pagination
    const offset = (pageNum - 1) * limitNum;
    const paginatedItems = items.slice(offset, offset + limitNum);

    res.json({
      items: paginatedItems,
      pagination: {
        total: items.length,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(items.length / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching reconciliation items:', error);
    serverError(res, 'Failed to fetch reconciliation items');
  }
};

/**
 * Get discrepancies for a reconciliation
 */
export const getReconciliationDiscrepancies = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const discrepancies = await reconciliationService.getDiscrepancies(id);

    res.json({ discrepancies });
  } catch (error) {
    logger.error('Error fetching discrepancies:', error);
    serverError(res, 'Failed to fetch discrepancies');
  }
};

/**
 * Get all discrepancies with filtering
 */
export const getAllDiscrepancies = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      severity,
      discrepancy_type,
      assigned_to,
      reconciliation_id,
      donation_id,
      page = '1',
      limit = '20',
    } = req.query as DiscrepancyQueryParams;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = 'SELECT * FROM payment_discrepancies WHERE 1=1';
    const params: QueryValue[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (severity) {
      query += ` AND severity = $${paramIndex++}`;
      params.push(severity);
    }

    if (discrepancy_type) {
      query += ` AND discrepancy_type = $${paramIndex++}`;
      params.push(discrepancy_type);
    }

    if (assigned_to) {
      query += ` AND assigned_to = $${paramIndex++}`;
      params.push(assigned_to);
    }

    if (reconciliation_id) {
      query += ` AND reconciliation_id = $${paramIndex++}`;
      params.push(reconciliation_id);
    }

    if (donation_id) {
      query += ` AND donation_id = $${paramIndex++}`;
      params.push(donation_id);
    }

    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS count_query`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Add pagination and ordering
    query += ` ORDER BY severity DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    res.json({
      discrepancies: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching all discrepancies:', error);
    serverError(res, 'Failed to fetch discrepancies');
  }
};

/**
 * Manually match a donation to a Stripe transaction
 */
export const manualMatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { donation_id, stripe_payment_intent_id } = req.body as MatchTransactionRequest;
    const userId = req.user?.id;

    if (!donation_id || !stripe_payment_intent_id) {
      badRequest(res, 'donation_id and stripe_payment_intent_id are required');
      return;
    }

    await reconciliationService.manualMatch(donation_id, stripe_payment_intent_id, userId);

    logger.info('Manually matched donation to Stripe transaction', {
      userId,
      donationId: donation_id,
      stripePaymentIntentId: stripe_payment_intent_id,
    });

    res.json({ success: true, message: 'Transaction matched successfully' });
  } catch (error) {
    logger.error('Error matching transaction:', error);
    serverError(res, 'Failed to match transaction');
  }
};

/**
 * Resolve a discrepancy
 */
export const resolveDiscrepancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolution_notes, status } = req.body as ResolveDiscrepancyRequest;
    const userId = req.user?.id;

    if (!resolution_notes || !status) {
      badRequest(res, 'resolution_notes and status are required');
      return;
    }

    if (!['resolved', 'closed', 'ignored'].includes(status)) {
      badRequest(res, 'Invalid status. Must be resolved, closed, or ignored');
      return;
    }

    await reconciliationService.resolveDiscrepancy(id, status, resolution_notes, userId);

    logger.info('Resolved discrepancy', {
      userId,
      discrepancyId: id,
      status,
    });

    res.json({ success: true, message: 'Discrepancy resolved successfully' });
  } catch (error) {
    logger.error('Error resolving discrepancy:', error);
    serverError(res, 'Failed to resolve discrepancy');
  }
};

/**
 * Get reconciliation dashboard statistics
 */
export const getReconciliationDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Get latest reconciliation
    const latestResult = await pool.query(`
      SELECT * FROM payment_reconciliations
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // Get all-time stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_reconciliations,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_reconciliations,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_reconciliations,
        SUM(matched_count) as total_matched,
        SUM(discrepancy_count) as total_discrepancies
      FROM payment_reconciliations
    `);

    // Get open discrepancies count
    const discrepanciesResult = await pool.query(`
      SELECT
        COUNT(*) as total_open_discrepancies,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_discrepancies,
        COUNT(*) FILTER (WHERE severity = 'high') as high_discrepancies
      FROM payment_discrepancies
      WHERE status = 'open'
    `);

    // Get unreconciled donations count
    const unreconciledResult = await pool.query(`
      SELECT COUNT(*) as unreconciled_donations
      FROM donations
      WHERE payment_status = 'completed'
      AND reconciliation_status = 'unreconciled'
    `);

    res.json({
      latest_reconciliation: latestResult.rows[0] || null,
      stats: {
        ...statsResult.rows[0],
        ...discrepanciesResult.rows[0],
        ...unreconciledResult.rows[0],
      },
    });
  } catch (error) {
    logger.error('Error fetching reconciliation dashboard:', error);
    serverError(res, 'Failed to fetch dashboard data');
  }
};

/**
 * Assign a discrepancy to a user
 */
export const assignDiscrepancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { assigned_to, due_date } = req.body;

    if (!assigned_to) {
      badRequest(res, 'assigned_to is required');
      return;
    }

    await pool.query(
      `
      UPDATE payment_discrepancies
      SET assigned_to = $1, due_date = $2, updated_at = NOW()
      WHERE id = $3
    `,
      [assigned_to, due_date || null, id]
    );

    logger.info('Assigned discrepancy', {
      discrepancyId: id,
      assignedTo: assigned_to,
    });

    res.json({ success: true, message: 'Discrepancy assigned successfully' });
  } catch (error) {
    logger.error('Error assigning discrepancy:', error);
    serverError(res, 'Failed to assign discrepancy');
  }
};