/**
 * Payment Reconciliation Service
 * Handles reconciliation between Stripe transactions and internal donation records
 */

import crypto from 'crypto';
import { logger } from '@config/logger';
import pool from '@config/database';
import type {
  PaymentReconciliation,
  ReconciliationItem,
  PaymentDiscrepancy,
  ReconciliationSummary,
  CreateReconciliationRequest,
  MatchStatus,
} from '@app-types/reconciliation';
import { matchTransactions } from './reconciliationMatching';
import {
  createDiscrepancies,
  createReconciliationItems,
  fetchDonationsForReconciliation,
  saveStripeBalanceTransactions,
  type Queryable,
} from './reconciliationPersistence';
import { fetchStripeBalanceTransactions, isStripeConfigured } from './stripeSync';

export { fetchStripeBalanceTransactions, isStripeConfigured } from './stripeSync';
export { matchTransactions } from './reconciliationMatching';

const PAYMENT_RECONCILIATION_COLUMNS = `
  id,
  reconciliation_number,
  reconciliation_type,
  status,
  start_date,
  end_date,
  stripe_balance_amount,
  stripe_charge_count,
  stripe_refund_count,
  stripe_total_fees,
  donations_total_amount,
  donations_count,
  matched_count,
  unmatched_stripe_count,
  unmatched_donations_count,
  discrepancy_count,
  started_at,
  completed_at,
  initiated_by,
  notes,
  created_at,
  updated_at
`;

const RECONCILIATION_ITEM_COLUMNS = `
  id,
  reconciliation_id,
  donation_id,
  stripe_payment_intent_id,
  stripe_charge_id,
  stripe_balance_transaction_id,
  stripe_amount,
  stripe_fee,
  stripe_net,
  stripe_created_at,
  stripe_status,
  donation_amount,
  donation_date,
  donation_status,
  match_status,
  match_confidence,
  has_discrepancy,
  discrepancy_type,
  discrepancy_amount,
  notes,
  resolved,
  resolved_at,
  resolved_by,
  created_at,
  updated_at
`;

const PAYMENT_DISCREPANCY_COLUMNS = `
  id,
  reconciliation_id,
  reconciliation_item_id,
  discrepancy_type,
  severity,
  donation_id,
  stripe_payment_intent_id,
  stripe_charge_id,
  expected_amount,
  actual_amount,
  difference_amount,
  description,
  status,
  resolution_notes,
  resolved_at,
  resolved_by,
  assigned_to,
  due_date,
  created_at,
  updated_at
`;

type ReconciliationMutationErrorCode = 'not_found' | 'no_op';

const createReconciliationMutationError = (
  code: ReconciliationMutationErrorCode,
  message: string
): Error & { code: ReconciliationMutationErrorCode } => Object.assign(new Error(message), { code });

const normalizeComparableDate = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * Generate unique reconciliation number
 */
function generateReconciliationNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `REC-${year}${month}${day}-${random}`;
}

/**
 * Create a new payment reconciliation
 */
export async function createReconciliation(
  request: CreateReconciliationRequest,
  userId?: string
): Promise<PaymentReconciliation> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const reconciliationNumber = generateReconciliationNumber();
  const startDate = new Date(request.start_date);
  const endDate = new Date(request.end_date);

  try {
    const [stripeTransactions, donations] = await Promise.all([
      fetchStripeBalanceTransactions(startDate, endDate),
      fetchDonationsForReconciliation(startDate, endDate),
    ]);

    const chargeTransactions = stripeTransactions.filter((tx) => tx.type === 'charge');
    const refundTransactions = stripeTransactions.filter((tx) => tx.type === 'refund');
    const stripeBalanceAmount = chargeTransactions.reduce((sum, tx) => sum + tx.amount / 100, 0);
    const stripeTotalFees = stripeTransactions.reduce((sum, tx) => sum + tx.fee / 100, 0);
    const donationsTotalAmount = donations.reduce((sum, d) => sum + parseFloat(String(d.amount)), 0);
    const { matched, unmatchedDonations, unmatchedStripe } = matchTransactions(donations, stripeTransactions);
    const reconciliationId = crypto.randomUUID();

    const reconciliation = await withTransaction(async (client) => {
      if (userId) {
        await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
      }

      const reconciliationResult = await client.query(
        `
        INSERT INTO payment_reconciliations (
          id,
          reconciliation_number, reconciliation_type, status,
          start_date, end_date, initiated_by, notes, started_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, 'in_progress', $4, $5, $6, $7, NOW(), NOW(), NOW())
        RETURNING *
      `,
        [
          reconciliationId,
          reconciliationNumber,
          request.reconciliation_type,
          startDate,
          endDate,
          userId,
          request.notes,
        ]
      );

      const reconciliationRow = reconciliationResult.rows[0];

      logger.info(`Starting reconciliation ${reconciliationRow.id}`, {
        reconciliationNumber,
        startDate,
        endDate,
      });

      await saveStripeBalanceTransactions(client, stripeTransactions, reconciliationRow.id);
      await createReconciliationItems(client, reconciliationRow.id, matched, unmatchedDonations, unmatchedStripe);
      await createDiscrepancies(client, reconciliationRow.id);

      const updateResult = await client.query(
        `
        UPDATE payment_reconciliations SET
          status = 'completed',
          stripe_balance_amount = $1,
          stripe_charge_count = $2,
          stripe_refund_count = $3,
          stripe_total_fees = $4,
          donations_total_amount = $5,
          donations_count = $6,
          matched_count = $7,
          unmatched_stripe_count = $8,
          unmatched_donations_count = $9,
          discrepancy_count = $10,
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = $11
        RETURNING *
      `,
        [
          stripeBalanceAmount,
          chargeTransactions.length,
          refundTransactions.length,
          stripeTotalFees,
          donationsTotalAmount,
          donations.length,
          matched.length,
          unmatchedStripe.length,
          unmatchedDonations.length,
          unmatchedDonations.length + unmatchedStripe.length,
          reconciliationRow.id,
        ]
      );

      logger.info(`Completed reconciliation ${reconciliationRow.id}`, {
        matched: matched.length,
        unmatchedDonations: unmatchedDonations.length,
        unmatchedStripe: unmatchedStripe.length,
      });

      return updateResult.rows[0];
    });

    return reconciliation;
  } catch (error) {
    logger.error(`Error creating reconciliation:`, error);
    throw error;
  }
}

async function withTransaction<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback failures while preserving the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get reconciliation by ID with full details
 */
export async function getReconciliationById(reconciliationId: string): Promise<any> {
  const result = await pool.query(
    `
    SELECT ${PAYMENT_RECONCILIATION_COLUMNS}
    FROM payment_reconciliations
    WHERE id = $1
  `,
    [reconciliationId]
  );

  if (result.rows.length === 0) {
    throw new Error('Reconciliation not found');
  }

  return result.rows[0];
}

/**
 * Get reconciliation items
 */
export async function getReconciliationItems(
  reconciliationId: string,
  matchStatus?: MatchStatus
): Promise<ReconciliationItem[]> {
  let query = `SELECT ${RECONCILIATION_ITEM_COLUMNS} FROM reconciliation_items WHERE reconciliation_id = $1`;
  const params: any[] = [reconciliationId];

  if (matchStatus) {
    query += ` AND match_status = $2`;
    params.push(matchStatus);
  }

  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get discrepancies for a reconciliation
 */
export async function getDiscrepancies(reconciliationId: string): Promise<PaymentDiscrepancy[]> {
  const result = await pool.query(
    `
    SELECT ${PAYMENT_DISCREPANCY_COLUMNS}
    FROM payment_discrepancies
    WHERE reconciliation_id = $1
    ORDER BY severity DESC, created_at DESC
  `,
    [reconciliationId]
  );

  return result.rows;
}

/**
 * Get reconciliation summary
 */
export async function getReconciliationSummary(reconciliationId: string): Promise<ReconciliationSummary> {
  const reconciliation = await getReconciliationById(reconciliationId);

  // Count discrepancies by status
  const discrepanciesResult = await pool.query(
    `
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'open') as open,
      COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved
    FROM payment_discrepancies
    WHERE reconciliation_id = $1
  `,
    [reconciliationId]
  );

  const discrepancyStats = discrepanciesResult.rows[0];

  return {
    total_donations: reconciliation.donations_count || 0,
    total_donation_amount: parseFloat(reconciliation.donations_total_amount) || 0,
    total_stripe_charges: reconciliation.stripe_charge_count || 0,
    total_stripe_amount: parseFloat(reconciliation.stripe_balance_amount) || 0,
    total_stripe_fees: parseFloat(reconciliation.stripe_total_fees) || 0,
    total_net_amount:
      (parseFloat(reconciliation.stripe_balance_amount) || 0) - (parseFloat(reconciliation.stripe_total_fees) || 0),
    matched_transactions: reconciliation.matched_count || 0,
    unmatched_donations: reconciliation.unmatched_donations_count || 0,
    unmatched_stripe: reconciliation.unmatched_stripe_count || 0,
    discrepancies: reconciliation.discrepancy_count || 0,
    open_discrepancies: parseInt(discrepancyStats.open) || 0,
    resolved_discrepancies: parseInt(discrepancyStats.resolved) || 0,
  };
}

/**
 * Manually match a Stripe transaction to a donation
 */
export async function manualMatch(
  donationId: string,
  stripePaymentIntentId: string,
  userId?: string
): Promise<void> {
  const currentResult = await pool.query(
    `
    SELECT stripe_payment_intent_id, reconciliation_status, reconciled_by
    FROM donations
    WHERE id = $1
  `,
    [donationId]
  );

  const currentDonation = currentResult.rows[0];
  if (!currentDonation) {
    throw createReconciliationMutationError('not_found', `Donation ${donationId} not found`);
  }

  const normalizedUserId = userId ?? null;
  if (
    currentDonation.stripe_payment_intent_id === stripePaymentIntentId &&
    currentDonation.reconciliation_status === 'matched' &&
    (currentDonation.reconciled_by ?? null) === normalizedUserId
  ) {
    throw createReconciliationMutationError(
      'no_op',
      `Donation ${donationId} is already matched to that payment intent`
    );
  }

  const updateResult = await pool.query(
    `
    UPDATE donations SET
      stripe_payment_intent_id = $1,
      reconciliation_status = 'matched',
      reconciled_at = NOW(),
      reconciled_by = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING id
  `,
    [stripePaymentIntentId, userId, donationId]
  );

  if ((updateResult.rowCount ?? 0) === 0) {
    throw createReconciliationMutationError('not_found', `Donation ${donationId} not found`);
  }

  logger.info(`Manually matched donation ${donationId} to Stripe payment ${stripePaymentIntentId}`);
}

/**
 * Resolve a discrepancy
 */
export async function resolveDiscrepancy(
  discrepancyId: string,
  status: 'resolved' | 'closed' | 'ignored',
  resolutionNotes: string,
  userId?: string
): Promise<void> {
  const currentResult = await pool.query(
    `
    SELECT status, resolution_notes, resolved_by
    FROM payment_discrepancies
    WHERE id = $1
  `,
    [discrepancyId]
  );

  const currentDiscrepancy = currentResult.rows[0];
  if (!currentDiscrepancy) {
    throw createReconciliationMutationError('not_found', `Discrepancy ${discrepancyId} not found`);
  }

  if (
    currentDiscrepancy.status === status &&
    (currentDiscrepancy.resolution_notes ?? null) === resolutionNotes &&
    (currentDiscrepancy.resolved_by ?? null) === (userId ?? null)
  ) {
    throw createReconciliationMutationError(
      'no_op',
      `Discrepancy ${discrepancyId} is already in the requested state`
    );
  }

  const updateResult = await pool.query(
    `
    UPDATE payment_discrepancies SET
      status = $1,
      resolution_notes = $2,
      resolved_at = NOW(),
      resolved_by = $3,
      updated_at = NOW()
    WHERE id = $4
    RETURNING id
  `,
    [status, resolutionNotes, userId, discrepancyId]
  );

  if ((updateResult.rowCount ?? 0) === 0) {
    throw createReconciliationMutationError('not_found', `Discrepancy ${discrepancyId} not found`);
  }

  logger.info(`Resolved discrepancy ${discrepancyId} with status ${status}`);
}

/**
 * Assign a discrepancy to a user
 */
export async function assignDiscrepancy(
  discrepancyId: string,
  assignedTo: string,
  dueDate?: string | null
): Promise<void> {
  const currentResult = await pool.query(
    `
    SELECT assigned_to, due_date
    FROM payment_discrepancies
    WHERE id = $1
  `,
    [discrepancyId]
  );

  const currentDiscrepancy = currentResult.rows[0];
  if (!currentDiscrepancy) {
    throw createReconciliationMutationError('not_found', `Discrepancy ${discrepancyId} not found`);
  }

  const currentDueDate = normalizeComparableDate(currentDiscrepancy.due_date);
  const nextDueDate = normalizeComparableDate(dueDate);

  if ((currentDiscrepancy.assigned_to ?? null) === assignedTo && currentDueDate === nextDueDate) {
    throw createReconciliationMutationError(
      'no_op',
      `Discrepancy ${discrepancyId} is already assigned to that user`
    );
  }

  const updateResult = await pool.query(
    `
    UPDATE payment_discrepancies
    SET assigned_to = $1, due_date = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING id
  `,
    [assignedTo, dueDate || null, discrepancyId]
  );

  if ((updateResult.rowCount ?? 0) === 0) {
    throw createReconciliationMutationError('not_found', `Discrepancy ${discrepancyId} not found`);
  }

  logger.info(`Assigned discrepancy ${discrepancyId} to ${assignedTo}`);
}
