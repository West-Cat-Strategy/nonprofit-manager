import type { Pool } from 'pg';
import { DonationAnalyticsService } from '@services/analytics/donationAnalytics';

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@config/redis', () => ({
  getCached: jest.fn().mockResolvedValue(null),
  setCached: jest.fn().mockResolvedValue(undefined),
}));

describe('DonationAnalyticsService', () => {
  it('returns mapped donation metrics payload', async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ total_amount: '100', total_count: '2', average_amount: '50', first_donation_date: null, last_donation_date: null, largest_donation: '70', recurring_donations: '1', recurring_amount: '30' }] })
        .mockResolvedValueOnce({ rows: [{ payment_method: 'credit_card', count: '2', amount: '100' }] })
        .mockResolvedValueOnce({ rows: [{ year: '2026', count: '2', amount: '100' }] }),
    } as unknown as Pool;

    const service = new DonationAnalyticsService(pool);
    const result = await service.getDonationMetrics('account', 'acc-1');

    expect(result.total_amount).toBe(100);
    expect(result.by_payment_method.credit_card.count).toBe(2);
  });
});
