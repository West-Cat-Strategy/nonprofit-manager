import Stripe from 'stripe';
import type { MatchConfidence } from '@app-types/reconciliation';

const MATCH_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ReconciliationDonationRecord {
  id: string;
  amount: number | string;
  currency?: string | null;
  donation_date: Date | string;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  payment_status?: string | null;
  [key: string]: unknown;
}

export interface ReconciliationMatch {
  donation: ReconciliationDonationRecord;
  transaction: Stripe.BalanceTransaction;
  confidence: MatchConfidence;
}

export interface ReconciliationMatchResult {
  matched: ReconciliationMatch[];
  unmatchedDonations: ReconciliationDonationRecord[];
  unmatchedStripe: Stripe.BalanceTransaction[];
}

const getChargeReferenceId = (tx: Stripe.BalanceTransaction): string | null =>
  typeof tx.source === 'string' ? tx.source : null;

const getAmountBucketKey = (amountCents: number, currency?: string | null): string =>
  `${(currency || 'unknown').toLowerCase()}:${amountCents}`;

const getDayBucket = (value: Date): number => Math.floor(value.getTime() / MATCH_WINDOW_MS);

const getDonationAmountCents = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
};

export function matchTransactions(
  donations: ReconciliationDonationRecord[],
  stripeTransactions: Stripe.BalanceTransaction[]
): ReconciliationMatchResult {
  const matched: ReconciliationMatch[] = [];
  const unmatchedDonations: ReconciliationDonationRecord[] = [];
  const usedStripeTransactionIds = new Set<string>();

  const chargeTransactions = stripeTransactions.filter((tx) => tx.type === 'charge');
  const chargeLookup = new Map<string, Stripe.BalanceTransaction>();
  const amountBuckets = new Map<string, Map<number, Stripe.BalanceTransaction[]>>();

  for (const tx of chargeTransactions) {
    const referenceId = getChargeReferenceId(tx);
    if (referenceId && !chargeLookup.has(referenceId)) {
      chargeLookup.set(referenceId, tx);
    }

    if (!chargeLookup.has(tx.id)) {
      chargeLookup.set(tx.id, tx);
    }

    const txAmountKey = getAmountBucketKey(tx.amount, tx.currency);
    const txDayBucket = getDayBucket(new Date(tx.created * 1000));
    const amountBucket = amountBuckets.get(txAmountKey) ?? new Map<number, Stripe.BalanceTransaction[]>();
    const dayBucket = amountBucket.get(txDayBucket) ?? [];
    dayBucket.push(tx);
    amountBucket.set(txDayBucket, dayBucket);
    amountBuckets.set(txAmountKey, amountBucket);
  }

  const findHighConfidenceMatch = (donation: ReconciliationDonationRecord): Stripe.BalanceTransaction | null => {
    for (const candidateId of [donation.stripe_payment_intent_id, donation.stripe_charge_id]) {
      if (typeof candidateId !== 'string' || candidateId.length === 0) {
        continue;
      }

      const transaction = chargeLookup.get(candidateId);
      if (transaction && !usedStripeTransactionIds.has(transaction.id)) {
        return transaction;
      }
    }

    return null;
  };

  const findMediumConfidenceMatch = (donation: ReconciliationDonationRecord): Stripe.BalanceTransaction | null => {
    const donationAmountCents = getDonationAmountCents(donation.amount);
    if (donationAmountCents === null) {
      return null;
    }

    const donationDate = new Date(donation.donation_date);
    if (Number.isNaN(donationDate.getTime())) {
      return null;
    }

    const amountKey = getAmountBucketKey(donationAmountCents, donation.currency);
    const amountBucket = amountBuckets.get(amountKey);
    if (!amountBucket) {
      return null;
    }

    const donationDayBucket = getDayBucket(donationDate);
    for (const dayBucket of [donationDayBucket - 1, donationDayBucket, donationDayBucket + 1]) {
      const candidates = amountBucket.get(dayBucket);
      if (!candidates || candidates.length === 0) {
        continue;
      }

      for (const transaction of candidates) {
        if (usedStripeTransactionIds.has(transaction.id)) {
          continue;
        }

        const transactionDate = new Date(transaction.created * 1000);
        const amountMatches = Math.abs(donationAmountCents - transaction.amount) <= 1;
        const dateWithinWindow = Math.abs(donationDate.getTime() - transactionDate.getTime()) < MATCH_WINDOW_MS;

        if (amountMatches && dateWithinWindow) {
          return transaction;
        }
      }
    }

    return null;
  };

  for (const donation of donations) {
    const highConfidenceMatch = findHighConfidenceMatch(donation);
    if (highConfidenceMatch) {
      matched.push({
        donation,
        transaction: highConfidenceMatch,
        confidence: 'high',
      });
      usedStripeTransactionIds.add(highConfidenceMatch.id);
      continue;
    }

    const mediumConfidenceMatch = findMediumConfidenceMatch(donation);
    if (mediumConfidenceMatch) {
      matched.push({
        donation,
        transaction: mediumConfidenceMatch,
        confidence: 'medium',
      });
      usedStripeTransactionIds.add(mediumConfidenceMatch.id);
      continue;
    }

    unmatchedDonations.push(donation);
  }

  return {
    matched,
    unmatchedDonations,
    unmatchedStripe: chargeTransactions.filter((tx) => !usedStripeTransactionIds.has(tx.id)),
  };
}
