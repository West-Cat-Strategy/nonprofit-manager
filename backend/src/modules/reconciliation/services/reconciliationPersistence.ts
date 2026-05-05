import type * as StripeCore from 'stripe/cjs/stripe.core.js';
import type { PoolClient } from 'pg';
import pool from '@config/database';
import type { MatchConfidence } from '@app-types/reconciliation';
import type { ReconciliationDonationRecord } from './reconciliationMatching';

export type Queryable = Pick<PoolClient, 'query'>;

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
  matchStatus: string;
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

export async function saveStripeBalanceTransactions(
  queryable: Queryable,
  transactions: StripeCore.Stripe.BalanceTransaction[],
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

export async function fetchDonationsForReconciliation(
  startDate: Date,
  endDate: Date
): Promise<ReconciliationDonationRecord[]> {
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

export async function createReconciliationItems(
  queryable: Queryable,
  reconciliationId: string,
  matched: Array<{
    donation: ReconciliationDonationRecord;
    transaction: StripeCore.Stripe.BalanceTransaction;
    confidence: MatchConfidence;
  }>,
  unmatchedDonations: ReconciliationDonationRecord[],
  unmatchedStripe: StripeCore.Stripe.BalanceTransaction[]
): Promise<void> {
  const matchedRows: MatchedReconciliationBatchRow[] = matched.map(({ donation, transaction, confidence }) => {
    const stripeAmount = transaction.amount / 100;
    const donationAmount = parseFloat(String(donation.amount));
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
      donationStatus: (donation.payment_status as string | null | undefined) ?? null,
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
    donationAmount: parseFloat(String(donation.amount)),
    donationDate: donation.donation_date,
    donationStatus: (donation.payment_status as string | null | undefined) ?? null,
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

export async function createDiscrepancies(queryable: Queryable, reconciliationId: string): Promise<void> {
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
