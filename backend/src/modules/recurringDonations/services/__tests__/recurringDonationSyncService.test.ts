import type { Pool } from 'pg';
import type { DonationService } from '@services/donationService';
import { RecurringDonationSyncService } from '../recurringDonationSyncService';
import {
  getPlanByWhere,
  syncPlanFromSubscription,
} from '../recurringDonationHelpers';

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@services/publishing', () => ({
  publishingService: {
    recordAnalyticsEvent: jest.fn(),
  },
}));

jest.mock('../recurringDonationHelpers', () => ({
  getPlanByWhere: jest.fn(),
  syncPlanFromSubscription: jest.fn(),
}));

const mockGetPlanByWhere = getPlanByWhere as jest.MockedFunction<typeof getPlanByWhere>;
const mockSyncPlanFromSubscription = syncPlanFromSubscription as jest.MockedFunction<
  typeof syncPlanFromSubscription
>;

describe('RecurringDonationSyncService', () => {
  const mockQuery = jest.fn();
  const mockCreateDonation = jest.fn();
  let service: RecurringDonationSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockCreateDonation.mockReset();
    service = new RecurringDonationSyncService(
      { query: mockQuery } as unknown as Pool,
      { createDonation: mockCreateDonation } as unknown as DonationService
    );
  });

  it('propagates typed designations from recurring invoices to created donations', async () => {
    const plan = {
      recurring_plan_id: 'plan-1',
      account_id: 'account-1',
      contact_id: 'contact-1',
      organization_id: 'org-1',
      donor_name: 'Ada Lovelace',
      payment_provider: 'stripe',
      campaign_name: 'Monthly donors',
      designation_id: 'designation-1',
      designation: 'Building Fund',
      notes: 'Monthly plan note',
      modified_by: 'user-1',
      created_by: 'creator-1',
      provider_checkout_session_id: null,
      stripe_checkout_session_id: 'cs-1',
    } as Awaited<ReturnType<typeof getPlanByWhere>>;

    mockGetPlanByWhere.mockResolvedValueOnce(plan);
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockSyncPlanFromSubscription.mockResolvedValueOnce({
      ...plan,
      next_billing_at: '2026-06-15T00:00:00.000Z',
    } as Awaited<ReturnType<typeof syncPlanFromSubscription>>);
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await service.handleInvoicePaid({
      id: 'in-1',
      subscription: 'sub-1',
      customer: 'cus-1',
      amount_paid: 2500,
      currency: 'cad',
      payment_intent: 'pi-1',
      created: 1770000000,
      status_transitions: { paid_at: 1770000100 },
      provider: 'stripe',
    });

    expect(mockCreateDonation).toHaveBeenCalledWith(
      expect.objectContaining({
        recurring_plan_id: 'plan-1',
        designation_id: 'designation-1',
        designation: 'Building Fund',
        is_recurring: true,
        recurring_frequency: 'monthly',
      }),
      'user-1',
      'org-1'
    );
  });
});
