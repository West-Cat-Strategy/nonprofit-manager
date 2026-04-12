/**
 * Payment Reconciliation Service
 * Handles reconciliation between Stripe transactions and internal donation records
 */

import crypto from 'crypto';
import Stripe from 'stripe';
import type { PoolClient } from 'pg';
import { logger } from '@config/logger';
import pool from '@config/database';
import type {
  PaymentReconciliation,
  ReconciliationItem,
  PaymentDiscrepancy,
  ReconciliationSummary,
  CreateReconciliationRequest,
  MatchStatus,
  MatchConfidence,
} from '@app-types/reconciliation';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

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

type Queryable = Pick<PoolClient, 'query'>;

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

interface MatchedReconciliationBatchRow {
  donationId: string;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  stripeBalanceTransactionId: string;
  stripeAmount: number;
  stripeFee: number;
  stripeNet: number;
  stripeCreatedAt: Date;
  stripeStatus: string | null;
  donationAmount: number;
  donationDate: Date | string;
  donationStatus: string | null;
  matchStatus: MatchStatus;
  matchConfidence: MatchConfidence;
  hasDiscrepancy: boolean;
  discrepancyType: string | null;
  discrepancyAmount: number | null;
  donationReconciliationStatus: 'matched' | 'discrepancy';
}

interface UnmatchedDonationBatchRow {
  donationId: string;
  donationAmount: number;
  donationDate: Date | string;
  donationStatus: string | null;
}

interface UnmatchedStripeBatchRow {
  stripeChargeId: string | null;
  stripeBalanceTransactionId: string;
  stripeAmount: number;
  stripeFee: number;
  stripeNet: number;
  stripeCreatedAt: Date;
  stripeStatus: string | null;
}

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

    let startingAfter: string | undefined;

    // Fetch all balance transactions in the date range
    while (true) {
      const balanceTransactions = await stripeClient.balanceTransactions.list({
        created: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      transactions.push(...balanceTransactions.data);

      if (!balanceTransactions.has_more || balanceTransactions.data.length === 0) {
        break;
      }

      startingAfter = balanceTransactions.data[balanceTransactions.data.length - 1]?.id;
      if (!startingAfter) {
        break;
      }
    }

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
  queryable: Queryable,
  transactions: Stripe.BalanceTransaction[],
  reconciliationId: string
): Promise<void> {
  if (transactions.length === 0) {
    return;
  }

  const syncedAt = new Date();
  const rows = transactions.map((tx) => ({
    stripe_balance_transaction_id: tx.id,
    stripe_source_id: typeof tx.source === 'string' ? tx.source : null,
    stripe_source_type: tx.type,
    amount: tx.amount / 100,
    fee: tx.fee / 100,
    net: tx.net / 100,
    currency: tx.currency.toUpperCase(),
    status: tx.status ?? null,
    transaction_type: tx.type,
    stripe_description: tx.description || null,
    stripe_created_at: new Date(tx.created * 1000),
    stripe_available_on: tx.available_on ? new Date(tx.available_on * 1000) : null,
    synced_at: syncedAt,
  }));

  await queryable.query(
    `
      WITH stripe_payload AS (
        SELECT
          UNNEST($1::text[]) AS stripe_balance_transaction_id,
          UNNEST($2::text[]) AS stripe_source_id,
          UNNEST($3::text[]) AS stripe_source_type,
          UNNEST($4::numeric[]) AS amount,
          UNNEST($5::numeric[]) AS fee,
          UNNEST($6::numeric[]) AS net,
          UNNEST($7::text[]) AS currency,
          UNNEST($8::text[]) AS status,
          UNNEST($9::text[]) AS transaction_type,
          UNNEST($10::text[]) AS stripe_description,
          UNNEST($11::timestamptz[]) AS stripe_created_at,
          UNNEST($12::timestamptz[]) AS stripe_available_on,
          UNNEST($13::timestamptz[]) AS synced_at
      )
      INSERT INTO stripe_balance_transactions (
        stripe_balance_transaction_id,
        stripe_source_id,
        stripe_source_type,
        amount,
        fee,
        net,
        currency,
        status,
        transaction_type,
        stripe_description,
        stripe_metadata,
        stripe_created_at,
        stripe_available_on,
        reconciliation_id,
        synced_at,
        created_at,
        updated_at
      )
      SELECT
        stripe_balance_transaction_id,
        stripe_source_id,
        stripe_source_type,
        amount,
        fee,
        net,
        currency,
        status,
        transaction_type,
        stripe_description,
        NULL::jsonb,
        stripe_created_at,
        stripe_available_on,
        $14,
        synced_at,
        NOW(),
        NOW()
      FROM stripe_payload
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
      rows.map((row) => row.stripe_balance_transaction_id),
      rows.map((row) => row.stripe_source_id),
      rows.map((row) => row.stripe_source_type),
      rows.map((row) => row.amount),
      rows.map((row) => row.fee),
      rows.map((row) => row.net),
      rows.map((row) => row.currency),
      rows.map((row) => row.status),
      rows.map((row) => row.transaction_type),
      rows.map((row) => row.stripe_description),
      rows.map((row) => row.stripe_created_at),
      rows.map((row) => row.stripe_available_on),
      rows.map((row) => row.synced_at),
      reconciliationId,
    ]
  );
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
  queryable: Queryable,
  reconciliationId: string,
  matched: Array<{
    donation: any;
    transaction: Stripe.BalanceTransaction;
    confidence: MatchConfidence;
  }>,
  unmatchedDonations: any[],
  unmatchedStripe: Stripe.BalanceTransaction[]
): Promise<void> {
  const matchedRows: MatchedReconciliationBatchRow[] = matched.map(({ donation, transaction, confidence }) => {
    const stripeAmount = transaction.amount / 100;
    const donationAmount = parseFloat(donation.amount);
    const amountDiff = Math.abs(stripeAmount - donationAmount);
    const hasDiscrepancy = amountDiff > 0.01;
    return {
      donationId: donation.id,
      stripePaymentIntentId: donation.stripe_payment_intent_id ?? null,
      stripeChargeId: donation.stripe_charge_id || (transaction.source as string) || null,
      stripeBalanceTransactionId: transaction.id,
      stripeAmount,
      stripeFee: transaction.fee / 100,
      stripeNet: transaction.net / 100,
      stripeCreatedAt: new Date(transaction.created * 1000),
      stripeStatus: transaction.status ?? null,
      donationAmount,
      donationDate: donation.donation_date,
      donationStatus: donation.payment_status ?? null,
      matchStatus: hasDiscrepancy ? 'amount_mismatch' : 'matched',
      matchConfidence: confidence,
      hasDiscrepancy,
      discrepancyType: hasDiscrepancy ? 'amount_mismatch' : null,
      discrepancyAmount: hasDiscrepancy ? amountDiff : null,
      donationReconciliationStatus: hasDiscrepancy ? 'discrepancy' : 'matched',
    };
  });

  if (matchedRows.length > 0) {
    await queryable.query(
      `
      WITH matched_payload AS (
        SELECT
          UNNEST($2::uuid[]) AS donation_id,
          UNNEST($3::text[]) AS stripe_payment_intent_id,
          UNNEST($4::text[]) AS stripe_charge_id,
          UNNEST($5::text[]) AS stripe_balance_transaction_id,
          UNNEST($6::numeric[]) AS stripe_amount,
          UNNEST($7::numeric[]) AS stripe_fee,
          UNNEST($8::numeric[]) AS stripe_net,
          UNNEST($9::timestamptz[]) AS stripe_created_at,
          UNNEST($10::text[]) AS stripe_status,
          UNNEST($11::numeric[]) AS donation_amount,
          UNNEST($12::timestamptz[]) AS donation_date,
          UNNEST($13::text[]) AS donation_status,
          UNNEST($14::text[]) AS match_status,
          UNNEST($15::text[]) AS match_confidence,
          UNNEST($16::boolean[]) AS has_discrepancy,
          UNNEST($17::text[]) AS discrepancy_type,
          UNNEST($18::numeric[]) AS discrepancy_amount
      )
      INSERT INTO reconciliation_items (
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
        created_at,
        updated_at
      )
      SELECT
        $1,
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
        NOW(),
        NOW()
      FROM matched_payload
    `,
      [
        reconciliationId,
        matchedRows.map((row) => row.donationId),
        matchedRows.map((row) => row.stripePaymentIntentId),
        matchedRows.map((row) => row.stripeChargeId),
        matchedRows.map((row) => row.stripeBalanceTransactionId),
        matchedRows.map((row) => row.stripeAmount),
        matchedRows.map((row) => row.stripeFee),
        matchedRows.map((row) => row.stripeNet),
        matchedRows.map((row) => row.stripeCreatedAt),
        matchedRows.map((row) => row.stripeStatus),
        matchedRows.map((row) => row.donationAmount),
        matchedRows.map((row) => row.donationDate),
        matchedRows.map((row) => row.donationStatus),
        matchedRows.map((row) => row.matchStatus),
        matchedRows.map((row) => row.matchConfidence),
        matchedRows.map((row) => row.hasDiscrepancy),
        matchedRows.map((row) => row.discrepancyType),
        matchedRows.map((row) => row.discrepancyAmount),
      ]
    );

    await queryable.query(
      `
      WITH donation_updates AS (
        SELECT
          UNNEST($1::uuid[]) AS donation_id,
          UNNEST($2::text[]) AS reconciliation_status,
          UNNEST($3::numeric[]) AS stripe_fee,
          UNNEST($4::numeric[]) AS net_amount
      )
      UPDATE donations d
      SET
        reconciliation_status = updates.reconciliation_status,
        reconciled_at = NOW(),
        stripe_fee = updates.stripe_fee,
        net_amount = updates.net_amount,
        updated_at = NOW()
      FROM donation_updates updates
      WHERE d.id = updates.donation_id
    `,
      [
        matchedRows.map((row) => row.donationId),
        matchedRows.map((row) => row.donationReconciliationStatus),
        matchedRows.map((row) => row.stripeFee),
        matchedRows.map((row) => row.stripeNet),
      ]
    );
  }

  const unmatchedDonationRows: UnmatchedDonationBatchRow[] = unmatchedDonations.map((donation) => ({
    donationId: donation.id,
    donationAmount: parseFloat(donation.amount),
    donationDate: donation.donation_date,
    donationStatus: donation.payment_status ?? null,
  }));

  if (unmatchedDonationRows.length > 0) {
    await queryable.query(
      `
      WITH unmatched_donation_payload AS (
        SELECT
          UNNEST($2::uuid[]) AS donation_id,
          UNNEST($3::numeric[]) AS donation_amount,
          UNNEST($4::timestamptz[]) AS donation_date,
          UNNEST($5::text[]) AS donation_status
      )
      INSERT INTO reconciliation_items (
        reconciliation_id,
        donation_id,
        donation_amount,
        donation_date,
        donation_status,
        match_status,
        has_discrepancy,
        discrepancy_type,
        created_at,
        updated_at
      )
      SELECT
        $1,
        donation_id,
        donation_amount,
        donation_date,
        donation_status,
        'unmatched_donation',
        true,
        'missing_stripe_transaction',
        NOW(),
        NOW()
      FROM unmatched_donation_payload
    `,
      [
        reconciliationId,
        unmatchedDonationRows.map((row) => row.donationId),
        unmatchedDonationRows.map((row) => row.donationAmount),
        unmatchedDonationRows.map((row) => row.donationDate),
        unmatchedDonationRows.map((row) => row.donationStatus),
      ]
    );
  }

  const unmatchedStripeRows: UnmatchedStripeBatchRow[] = unmatchedStripe.map((tx) => ({
    stripeChargeId: (tx.source as string) || null,
    stripeBalanceTransactionId: tx.id,
    stripeAmount: tx.amount / 100,
    stripeFee: tx.fee / 100,
    stripeNet: tx.net / 100,
    stripeCreatedAt: new Date(tx.created * 1000),
    stripeStatus: tx.status ?? null,
  }));

  if (unmatchedStripeRows.length > 0) {
    await queryable.query(
      `
      WITH unmatched_stripe_payload AS (
        SELECT
          UNNEST($2::text[]) AS stripe_charge_id,
          UNNEST($3::text[]) AS stripe_balance_transaction_id,
          UNNEST($4::numeric[]) AS stripe_amount,
          UNNEST($5::numeric[]) AS stripe_fee,
          UNNEST($6::numeric[]) AS stripe_net,
          UNNEST($7::timestamptz[]) AS stripe_created_at,
          UNNEST($8::text[]) AS stripe_status
      )
      INSERT INTO reconciliation_items (
        reconciliation_id,
        stripe_charge_id,
        stripe_balance_transaction_id,
        stripe_amount,
        stripe_fee,
        stripe_net,
        stripe_created_at,
        stripe_status,
        match_status,
        has_discrepancy,
        discrepancy_type,
        created_at,
        updated_at
      )
      SELECT
        $1,
        stripe_charge_id,
        stripe_balance_transaction_id,
        stripe_amount,
        stripe_fee,
        stripe_net,
        stripe_created_at,
        stripe_status,
        'unmatched_stripe',
        true,
        'missing_donation',
        NOW(),
        NOW()
      FROM unmatched_stripe_payload
    `,
      [
        reconciliationId,
        unmatchedStripeRows.map((row) => row.stripeChargeId),
        unmatchedStripeRows.map((row) => row.stripeBalanceTransactionId),
        unmatchedStripeRows.map((row) => row.stripeAmount),
        unmatchedStripeRows.map((row) => row.stripeFee),
        unmatchedStripeRows.map((row) => row.stripeNet),
        unmatchedStripeRows.map((row) => row.stripeCreatedAt),
        unmatchedStripeRows.map((row) => row.stripeStatus),
      ]
    );
  }
}

/**
 * Create discrepancy records
 */
async function createDiscrepancies(queryable: Queryable, reconciliationId: string): Promise<void> {
  await queryable.query(
    `
    INSERT INTO payment_discrepancies (
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
      created_at,
      updated_at
    )
    SELECT
      ri.reconciliation_id,
      ri.id AS reconciliation_item_id,
      ri.discrepancy_type,
      CASE
        WHEN ri.match_status IN ('unmatched_donation', 'unmatched_stripe') THEN 'high'
        WHEN ri.match_status = 'amount_mismatch' AND COALESCE(ri.discrepancy_amount, 0) > 10 THEN 'high'
        ELSE 'medium'
      END::text AS severity,
      ri.donation_id,
      ri.stripe_payment_intent_id,
      ri.stripe_charge_id,
      ri.donation_amount,
      ri.stripe_amount,
      ri.discrepancy_amount,
      CASE
        WHEN ri.match_status = 'unmatched_donation' THEN
          'Donation ' || COALESCE(ri.donation_id::text, 'unknown') || ' (' ||
          COALESCE(ri.donation_amount::text, '0') || ' ' || COALESCE(ri.donation_status, 'unknown') ||
          ') has no matching Stripe transaction'
        WHEN ri.match_status = 'unmatched_stripe' THEN
          'Stripe transaction ' || COALESCE(ri.stripe_charge_id, 'unknown') || ' (' ||
          COALESCE(ri.stripe_amount::text, '0') || ') has no matching donation record'
        WHEN ri.match_status = 'amount_mismatch' THEN
          'Amount mismatch: Donation ' || COALESCE(ri.donation_amount::text, '0') || ' vs Stripe ' ||
          COALESCE(ri.stripe_amount::text, '0') || ' (difference: ' ||
          COALESCE(ri.discrepancy_amount::text, '0') || ')'
        ELSE 'Reconciliation discrepancy detected'
      END AS description,
      'open',
      NOW(),
      NOW()
    FROM reconciliation_items ri
    WHERE ri.reconciliation_id = $1
      AND ri.has_discrepancy = true
  `,
    [reconciliationId]
  );
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
    const donationsTotalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
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
