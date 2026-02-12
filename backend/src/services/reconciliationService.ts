/**
 * Payment Reconciliation Service
 * Handles reconciliation between Stripe transactions and internal donation records
 */

import Stripe from 'stripe';
import { logger } from '@config/logger';
import pool from '@config/database';
import type {
  PaymentReconciliation,
  ReconciliationItem,
  PaymentDiscrepancy,
  StripeBalanceTransaction,
  ReconciliationSummary,
  CreateReconciliationRequest,
  MatchStatus,
  MatchConfidence,
  DiscrepancySeverity,
} from '@app-types/reconciliation';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

/**
 * Get or initialize Stripe client
 */
function getStripeClient(): Stripe {
  if (!stripe) {
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(stripeSecretKey);
  }
  return stripe;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!stripeSecretKey;
}

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
 * Fetch Stripe balance transactions for a date range
 */
export async function fetchStripeBalanceTransactions(
  startDate: Date,
  endDate: Date
): Promise<Stripe.BalanceTransaction[]> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const stripeClient = getStripeClient();
  const transactions: Stripe.BalanceTransaction[] = [];

  try {
    // Convert dates to Unix timestamps
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    // Fetch all balance transactions in the date range
    const balanceTransactions = await stripeClient.balanceTransactions.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
    });

    // Add all transactions from response
    transactions.push(...balanceTransactions.data);

    logger.info(`Fetched ${transactions.length} Stripe balance transactions`, {
      startDate,
      endDate,
    });

    return transactions;
  } catch (error) {
    logger.error('Error fetching Stripe balance transactions:', error);
    throw error;
  }
}

/**
 * Save Stripe balance transactions to database
 */
async function saveStripeBalanceTransactions(
  transactions: Stripe.BalanceTransaction[],
  reconciliationId: string
): Promise<void> {
  for (const tx of transactions) {
    const data: Partial<StripeBalanceTransaction> = {
      stripe_balance_transaction_id: tx.id,
      stripe_source_id: tx.source as string,
      stripe_source_type: tx.type,
      amount: tx.amount / 100, // Convert cents to dollars
      fee: tx.fee / 100,
      net: tx.net / 100,
      currency: tx.currency.toUpperCase(),
      status: tx.status,
      transaction_type: tx.type,
      stripe_description: tx.description || null,
      stripe_metadata: null, // Metadata not available on balance transactions
      stripe_created_at: new Date(tx.created * 1000),
      stripe_available_on: tx.available_on ? new Date(tx.available_on * 1000) : null,
      reconciliation_id: reconciliationId,
      synced_at: new Date(),
    };

    // Insert or update balance transaction
    await pool.query(
      `
      INSERT INTO stripe_balance_transactions (
        stripe_balance_transaction_id, stripe_source_id, stripe_source_type,
        amount, fee, net, currency, status, transaction_type,
        stripe_description, stripe_metadata, stripe_created_at,
        stripe_available_on, reconciliation_id, synced_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), NOW())
      ON CONFLICT (stripe_balance_transaction_id)
      DO UPDATE SET
        amount = EXCLUDED.amount,
        fee = EXCLUDED.fee,
        net = EXCLUDED.net,
        status = EXCLUDED.status,
        reconciliation_id = EXCLUDED.reconciliation_id,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `,
      [
        data.stripe_balance_transaction_id,
        data.stripe_source_id,
        data.stripe_source_type,
        data.amount,
        data.fee,
        data.net,
        data.currency,
        data.status,
        data.transaction_type,
        data.stripe_description,
        JSON.stringify(data.stripe_metadata),
        data.stripe_created_at,
        data.stripe_available_on,
        data.reconciliation_id,
        data.synced_at,
      ]
    );
  }
}

/**
 * Fetch donations for a date range
 */
async function fetchDonationsForReconciliation(
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const result = await pool.query(
    `
    SELECT
      id,
      donation_number,
      amount,
      currency,
      donation_date,
      payment_method,
      payment_status,
      transaction_id,
      stripe_payment_intent_id,
      stripe_charge_id,
      stripe_fee,
      net_amount,
      reconciliation_status,
      created_at
    FROM donations
    WHERE donation_date >= $1 AND donation_date <= $2
    AND payment_status IN ('completed', 'pending')
    ORDER BY donation_date ASC
  `,
    [startDate, endDate]
  );

  return result.rows;
}

/**
 * Match Stripe transactions to donations
 */
function matchTransactions(
  donations: any[],
  stripeTransactions: Stripe.BalanceTransaction[]
): {
  matched: Array<{ donation: any; transaction: Stripe.BalanceTransaction; confidence: MatchConfidence }>;
  unmatchedDonations: any[];
  unmatchedStripe: Stripe.BalanceTransaction[];
} {
  const matched: Array<{
    donation: any;
    transaction: Stripe.BalanceTransaction;
    confidence: MatchConfidence;
  }> = [];
  const unmatchedDonations = [...donations];
  const unmatchedStripe = [...stripeTransactions];

  // Filter to only charge transactions
  const chargeTransactions = stripeTransactions.filter((tx) => tx.type === 'charge');

  // Match by Stripe payment intent ID or charge ID (high confidence)
  for (let i = unmatchedDonations.length - 1; i >= 0; i--) {
    const donation = unmatchedDonations[i];

    if (donation.stripe_payment_intent_id || donation.stripe_charge_id) {
      const txIndex = chargeTransactions.findIndex((tx) => {
        const sourceId = tx.source as string;
        return (
          sourceId === donation.stripe_payment_intent_id ||
          sourceId === donation.stripe_charge_id ||
          tx.id === donation.stripe_charge_id
        );
      });

      if (txIndex !== -1) {
        matched.push({
          donation,
          transaction: chargeTransactions[txIndex],
          confidence: 'high',
        });
        unmatchedDonations.splice(i, 1);
        const stripeIndex = unmatchedStripe.indexOf(chargeTransactions[txIndex]);
        if (stripeIndex !== -1) {
          unmatchedStripe.splice(stripeIndex, 1);
        }
      }
    }
  }

  // Match by amount and date (medium confidence)
  for (let i = unmatchedDonations.length - 1; i >= 0; i--) {
    const donation = unmatchedDonations[i];
    const donationAmount = parseFloat(donation.amount);
    const donationDate = new Date(donation.donation_date);

    for (let j = 0; j < unmatchedStripe.length; j++) {
      const tx = unmatchedStripe[j];
      if (tx.type !== 'charge') continue;

      const txAmount = tx.amount / 100;
      const txDate = new Date(tx.created * 1000);

      // Match if amount is the same and date is within 24 hours
      const amountMatches = Math.abs(donationAmount - txAmount) < 0.01;
      const dateWithin24Hours = Math.abs(donationDate.getTime() - txDate.getTime()) < 24 * 60 * 60 * 1000;

      if (amountMatches && dateWithin24Hours) {
        matched.push({
          donation,
          transaction: tx,
          confidence: 'medium',
        });
        unmatchedDonations.splice(i, 1);
        unmatchedStripe.splice(j, 1);
        break;
      }
    }
  }

  return {
    matched,
    unmatchedDonations,
    unmatchedStripe: unmatchedStripe.filter((tx) => tx.type === 'charge'),
  };
}

/**
 * Create reconciliation items for matched transactions
 */
async function createReconciliationItems(
  reconciliationId: string,
  matched: Array<{
    donation: any;
    transaction: Stripe.BalanceTransaction;
    confidence: MatchConfidence;
  }>,
  unmatchedDonations: any[],
  unmatchedStripe: Stripe.BalanceTransaction[]
): Promise<void> {
  // Create items for matched transactions
  for (const match of matched) {
    const { donation, transaction, confidence } = match;
    const stripeAmount = transaction.amount / 100;
    const donationAmount = parseFloat(donation.amount);
    const amountDiff = Math.abs(stripeAmount - donationAmount);
    const hasDiscrepancy = amountDiff > 0.01;

    await pool.query(
      `
      INSERT INTO reconciliation_items (
        reconciliation_id, donation_id,
        stripe_payment_intent_id, stripe_charge_id, stripe_balance_transaction_id,
        stripe_amount, stripe_fee, stripe_net, stripe_created_at, stripe_status,
        donation_amount, donation_date, donation_status,
        match_status, match_confidence,
        has_discrepancy, discrepancy_type, discrepancy_amount,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
    `,
      [
        reconciliationId,
        donation.id,
        donation.stripe_payment_intent_id,
        donation.stripe_charge_id || transaction.source,
        transaction.id,
        stripeAmount,
        transaction.fee / 100,
        transaction.net / 100,
        new Date(transaction.created * 1000),
        transaction.status,
        donationAmount,
        donation.donation_date,
        donation.payment_status,
        hasDiscrepancy ? 'amount_mismatch' : 'matched',
        confidence,
        hasDiscrepancy,
        hasDiscrepancy ? 'amount_mismatch' : null,
        hasDiscrepancy ? amountDiff : null,
      ]
    );

    // Update donation reconciliation status
    await pool.query(
      `
      UPDATE donations
      SET
        reconciliation_status = $1,
        reconciled_at = NOW(),
        stripe_fee = $2,
        net_amount = $3,
        updated_at = NOW()
      WHERE id = $4
    `,
      [hasDiscrepancy ? 'discrepancy' : 'matched', transaction.fee / 100, transaction.net / 100, donation.id]
    );
  }

  // Create items for unmatched donations
  for (const donation of unmatchedDonations) {
    await pool.query(
      `
      INSERT INTO reconciliation_items (
        reconciliation_id, donation_id,
        donation_amount, donation_date, donation_status,
        match_status, has_discrepancy, discrepancy_type,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'unmatched_donation', true, 'missing_stripe_transaction', NOW(), NOW())
    `,
      [reconciliationId, donation.id, donation.amount, donation.donation_date, donation.payment_status]
    );
  }

  // Create items for unmatched Stripe transactions
  for (const tx of unmatchedStripe) {
    await pool.query(
      `
      INSERT INTO reconciliation_items (
        reconciliation_id,
        stripe_charge_id, stripe_balance_transaction_id,
        stripe_amount, stripe_fee, stripe_net, stripe_created_at, stripe_status,
        match_status, has_discrepancy, discrepancy_type,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unmatched_stripe', true, 'missing_donation', NOW(), NOW())
    `,
      [
        reconciliationId,
        tx.source as string,
        tx.id,
        tx.amount / 100,
        tx.fee / 100,
        tx.net / 100,
        new Date(tx.created * 1000),
        tx.status,
      ]
    );
  }
}

/**
 * Create discrepancy records
 */
async function createDiscrepancies(reconciliationId: string): Promise<void> {
  // Find all reconciliation items with discrepancies
  const itemsResult = await pool.query(
    `
    SELECT * FROM reconciliation_items
    WHERE reconciliation_id = $1 AND has_discrepancy = true
  `,
    [reconciliationId]
  );

  for (const item of itemsResult.rows) {
    let severity: DiscrepancySeverity = 'medium';
    let description = '';

    if (item.match_status === 'unmatched_donation') {
      severity = 'high';
      description = `Donation ${item.donation_id} (${item.donation_amount} ${item.donation_status}) has no matching Stripe transaction`;
    } else if (item.match_status === 'unmatched_stripe') {
      severity = 'high';
      description = `Stripe transaction ${item.stripe_charge_id} (${item.stripe_amount}) has no matching donation record`;
    } else if (item.match_status === 'amount_mismatch') {
      severity = item.discrepancy_amount > 10 ? 'high' : 'medium';
      description = `Amount mismatch: Donation ${item.donation_amount} vs Stripe ${item.stripe_amount} (difference: ${item.discrepancy_amount})`;
    }

    await pool.query(
      `
      INSERT INTO payment_discrepancies (
        reconciliation_id, reconciliation_item_id,
        discrepancy_type, severity,
        donation_id, stripe_payment_intent_id, stripe_charge_id,
        expected_amount, actual_amount, difference_amount,
        description, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'open', NOW(), NOW())
    `,
      [
        reconciliationId,
        item.id,
        item.discrepancy_type,
        severity,
        item.donation_id,
        item.stripe_payment_intent_id,
        item.stripe_charge_id,
        item.donation_amount,
        item.stripe_amount,
        item.discrepancy_amount,
        description,
      ]
    );
  }
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
    // Create reconciliation record
    const reconciliationResult = await pool.query(
      `
      INSERT INTO payment_reconciliations (
        reconciliation_number, reconciliation_type, status,
        start_date, end_date, initiated_by, notes, started_at,
        created_at, updated_at
      ) VALUES ($1, $2, 'in_progress', $3, $4, $5, $6, NOW(), NOW(), NOW())
      RETURNING *
    `,
      [reconciliationNumber, request.reconciliation_type, startDate, endDate, userId, request.notes]
    );

    const reconciliation = reconciliationResult.rows[0];

    logger.info(`Starting reconciliation ${reconciliation.id}`, {
      reconciliationNumber,
      startDate,
      endDate,
    });

    // Fetch Stripe balance transactions
    const stripeTransactions = await fetchStripeBalanceTransactions(startDate, endDate);

    // Save Stripe transactions to database
    await saveStripeBalanceTransactions(stripeTransactions, reconciliation.id);

    // Calculate Stripe summary
    const chargeTransactions = stripeTransactions.filter((tx) => tx.type === 'charge');
    const refundTransactions = stripeTransactions.filter((tx) => tx.type === 'refund');
    const stripeBalanceAmount = chargeTransactions.reduce((sum, tx) => sum + tx.amount / 100, 0);
    const stripeTotalFees = stripeTransactions.reduce((sum, tx) => sum + tx.fee / 100, 0);

    // Fetch donations
    const donations = await fetchDonationsForReconciliation(startDate, endDate);
    const donationsTotalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);

    // Match transactions
    const { matched, unmatchedDonations, unmatchedStripe } = matchTransactions(donations, stripeTransactions);

    // Create reconciliation items
    await createReconciliationItems(reconciliation.id, matched, unmatchedDonations, unmatchedStripe);

    // Create discrepancy records
    await createDiscrepancies(reconciliation.id);

    // Update reconciliation with summary data
    const updateResult = await pool.query(
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
        reconciliation.id,
      ]
    );

    logger.info(`Completed reconciliation ${reconciliation.id}`, {
      matched: matched.length,
      unmatchedDonations: unmatchedDonations.length,
      unmatchedStripe: unmatchedStripe.length,
    });

    return updateResult.rows[0];
  } catch (error) {
    logger.error(`Error creating reconciliation:`, error);
    throw error;
  }
}

/**
 * Get reconciliation by ID with full details
 */
export async function getReconciliationById(reconciliationId: string): Promise<any> {
  const result = await pool.query(
    `
    SELECT * FROM payment_reconciliations WHERE id = $1
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
  let query = `SELECT * FROM reconciliation_items WHERE reconciliation_id = $1`;
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
    SELECT * FROM payment_discrepancies
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
  // Update donation with Stripe payment intent
  await pool.query(
    `
    UPDATE donations SET
      stripe_payment_intent_id = $1,
      reconciliation_status = 'matched',
      reconciled_at = NOW(),
      reconciled_by = $2,
      updated_at = NOW()
    WHERE id = $3
  `,
    [stripePaymentIntentId, userId, donationId]
  );

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
  await pool.query(
    `
    UPDATE payment_discrepancies SET
      status = $1,
      resolution_notes = $2,
      resolved_at = NOW(),
      resolved_by = $3,
      updated_at = NOW()
    WHERE id = $4
  `,
    [status, resolutionNotes, userId, discrepancyId]
  );

  logger.info(`Resolved discrepancy ${discrepancyId} with status ${status}`);
}
