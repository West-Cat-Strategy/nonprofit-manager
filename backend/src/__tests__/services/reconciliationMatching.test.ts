import type Stripe from 'stripe';
import {
  matchTransactions,
  type ReconciliationDonationRecord,
} from '@modules/reconciliation/services/reconciliationMatching';

const createChargeTransaction = (overrides: Partial<Stripe.BalanceTransaction>): Stripe.BalanceTransaction =>
  ({
    id: 'txn_default',
    object: 'balance_transaction',
    amount: 5000,
    available_on: 1_710_000_000,
    created: 1_710_000_000,
    currency: 'cad',
    description: null,
    exchange_rate: null,
    fee: 250,
    fee_details: [],
    net: 4750,
    reporting_category: 'charge',
    source: 'ch_default',
    status: 'available',
    type: 'charge',
    ...overrides,
  }) as Stripe.BalanceTransaction;

describe('reconciliationMatching.matchTransactions', () => {
  it('prefers explicit Stripe identifiers for high-confidence matches', () => {
    const donation: ReconciliationDonationRecord = {
      id: 'don_1',
      amount: '50.00',
      currency: 'CAD',
      donation_date: '2024-03-10T12:00:00.000Z',
      stripe_payment_intent_id: 'pi_123',
    };
    const transaction = createChargeTransaction({
      id: 'txn_123',
      source: 'pi_123',
    });

    const result = matchTransactions([donation], [transaction]);

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]).toMatchObject({
      donation,
      transaction,
      confidence: 'high',
    });
    expect(result.unmatchedDonations).toHaveLength(0);
    expect(result.unmatchedStripe).toHaveLength(0);
  });

  it('falls back to amount-and-date matching when identifiers are missing', () => {
    const donation: ReconciliationDonationRecord = {
      id: 'don_2',
      amount: 75,
      currency: 'CAD',
      donation_date: '2024-04-12T09:30:00.000Z',
    };
    const transaction = createChargeTransaction({
      id: 'txn_456',
      amount: 7500,
      source: 'ch_456',
      created: Math.floor(new Date('2024-04-12T18:00:00.000Z').getTime() / 1000),
    });

    const result = matchTransactions([donation], [transaction]);

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]?.confidence).toBe('medium');
    expect(result.unmatchedDonations).toHaveLength(0);
    expect(result.unmatchedStripe).toHaveLength(0);
  });

  it('leaves non-charge Stripe entries unmatched', () => {
    const donation: ReconciliationDonationRecord = {
      id: 'don_3',
      amount: 20,
      currency: 'CAD',
      donation_date: '2024-05-01T10:00:00.000Z',
    };
    const refundTransaction = createChargeTransaction({
      id: 'txn_refund',
      type: 'refund',
      reporting_category: 'refund',
      source: 're_123',
    });

    const result = matchTransactions([donation], [refundTransaction]);

    expect(result.matched).toHaveLength(0);
    expect(result.unmatchedDonations).toEqual([donation]);
    expect(result.unmatchedStripe).toHaveLength(0);
  });
});
