import type { Pool } from 'pg';
import stripeService from '@services/stripeService';
import paymentProviderService from '@services/paymentProviderService';
import {
  getPlanByWhere,
  getReturnUrlForPlan,
  hashManagementToken,
} from '../recurringDonationHelpers';
import { RecurringDonationService } from '../recurringDonationService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@services/donationService', () => ({
  DonationService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@services/publishing/siteManagementService', () => ({
  SiteManagementService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@services/stripeService', () => ({
  __esModule: true,
  default: {
    getCheckoutSession: jest.fn(),
    createBillingPortalSession: jest.fn(),
    createMonthlyPrice: jest.fn(),
    updateSubscriptionPrice: jest.fn(),
    setSubscriptionCancelAtPeriodEnd: jest.fn(),
  },
}));

jest.mock('@services/paymentProviderService', () => ({
  __esModule: true,
  default: {
    getPaymentConfig: jest.fn(() => ({ defaultProvider: 'stripe' })),
    getCheckoutSession: jest.fn(),
    createBillingPortalSession: jest.fn(),
    createCustomer: jest.fn(),
    createCheckoutSession: jest.fn(),
  },
}));

jest.mock('../recurringDonationHelpers', () => ({
  FRONTEND_URL: 'https://frontend.example',
  PLAN_SELECT: 'rdp.id',
  buildPlanStatus: jest.fn((status: string, cancelAtPeriodEnd: boolean) =>
    cancelAtPeriodEnd ? `${status}-canceling` : status
  ),
  buildCheckoutUrls: jest.fn(),
  getContactStripeCustomerId: jest.fn(),
  getPlanByWhere: jest.fn(),
  getReturnUrlForPlan: jest.fn(),
  hashManagementToken: jest.fn(),
  mapPlanRow: jest.fn((row: unknown) => row),
  persistContactStripeCustomerId: jest.fn(),
  rotateManagementLink: jest.fn(),
  syncPlanFromSubscription: jest.fn(),
}));

const mockStripeService = stripeService as jest.Mocked<typeof stripeService>;
const mockPaymentProviderService =
  paymentProviderService as jest.Mocked<typeof paymentProviderService>;
const mockGetPlanByWhere = getPlanByWhere as jest.MockedFunction<typeof getPlanByWhere>;
const mockGetReturnUrlForPlan = getReturnUrlForPlan as jest.MockedFunction<
  typeof getReturnUrlForPlan
>;
const mockHashManagementToken = hashManagementToken as jest.MockedFunction<
  typeof hashManagementToken
>;

const basePlan = {
  recurring_plan_id: 'plan-1',
  amount: 25,
  currency: 'CAD',
  donor_name: 'Alex Donor',
  payment_provider: 'stripe',
  stripe_subscription_id: 'sub-1',
  stripe_price_id: 'price-1',
  stripe_product_id: 'prod-1',
  stripe_checkout_session_id: 'cs-linked',
  provider_checkout_session_id: null,
  provider_customer_id: 'cust-1',
  stripe_customer_id: null,
  campaign_name: null,
  designation: null,
  notes: null,
  next_billing_at: '2026-05-01T00:00:00.000Z',
  organization_id: 'org-1',
};

describe('RecurringDonationService', () => {
  const mockQuery = jest.fn();
  let service: RecurringDonationService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    service = new RecurringDonationService({ query: mockQuery } as unknown as Pool);
  });

  it('rejects non-Stripe amount changes before attempting a mutation', async () => {
    mockGetPlanByWhere.mockResolvedValueOnce({
      ...basePlan,
      payment_provider: 'paypal',
    } as Awaited<ReturnType<typeof getPlanByWhere>>);

    await expect(
      service.updatePlan('org-1', 'plan-1', 'user-1', {
        amount: 30,
      })
    ).rejects.toThrow('Amount changes are only supported for Stripe recurring plans in this release');

    expect(mockStripeService.createMonthlyPrice).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects Stripe amount changes when the subscription link is missing', async () => {
    mockGetPlanByWhere.mockResolvedValueOnce({
      ...basePlan,
      stripe_subscription_id: null,
    } as Awaited<ReturnType<typeof getPlanByWhere>>);

    await expect(
      service.updatePlan('org-1', 'plan-1', 'user-1', {
        amount: 30,
      })
    ).rejects.toThrow('Recurring donation plan is not yet connected to a Stripe subscription');

    expect(mockStripeService.createMonthlyPrice).not.toHaveBeenCalled();
  });

  it('rejects cancel requests when the Stripe subscription has not been connected yet', async () => {
    mockGetPlanByWhere.mockResolvedValueOnce({
      ...basePlan,
      stripe_subscription_id: null,
    } as Awaited<ReturnType<typeof getPlanByWhere>>);

    await expect(service.cancelPlan('org-1', 'plan-1', 'user-1')).rejects.toThrow(
      'Recurring donation plan is not yet connected to a Stripe subscription'
    );

    expect(mockStripeService.setSubscriptionCancelAtPeriodEnd).not.toHaveBeenCalled();
  });

  it('rejects checkout completion when the session does not match the stored plan session', async () => {
    mockGetPlanByWhere.mockResolvedValueOnce(
      basePlan as Awaited<ReturnType<typeof getPlanByWhere>>
    );
    mockStripeService.getCheckoutSession.mockResolvedValueOnce({
      id: 'cs-other',
      status: 'complete',
      customerId: 'cust-1',
    } as Awaited<ReturnType<typeof stripeService.getCheckoutSession>>);

    await expect(
      service.resolveCheckoutSuccess('plan-1', 'cs-other', 'https://public.example')
    ).rejects.toThrow('Checkout session does not match the requested recurring donation plan');
  });

  it('rejects management portal links when the plan has no customer association', async () => {
    mockHashManagementToken.mockReturnValue('token-hash');
    mockGetPlanByWhere.mockResolvedValueOnce({
      ...basePlan,
      provider_customer_id: null,
      stripe_customer_id: null,
    } as Awaited<ReturnType<typeof getPlanByWhere>>);

    await expect(service.getPortalSessionUrl('raw-token')).rejects.toThrow(
      'Recurring donation plan is not connected to a customer'
    );
  });

  it('opens a provider-specific management portal session when the plan has a customer', async () => {
    mockHashManagementToken.mockReturnValue('token-hash');
    mockGetPlanByWhere.mockResolvedValueOnce({
      ...basePlan,
      payment_provider: 'paypal',
      provider_customer_id: 'paypal-customer',
    } as Awaited<ReturnType<typeof getPlanByWhere>>);
    mockGetReturnUrlForPlan.mockResolvedValueOnce('https://public.example/return');
    mockPaymentProviderService.createBillingPortalSession.mockResolvedValueOnce({
      url: 'https://paypal.example/session',
    } as Awaited<ReturnType<typeof paymentProviderService.createBillingPortalSession>>);

    await expect(service.getPortalSessionUrl('raw-token')).resolves.toBe(
      'https://paypal.example/session'
    );
    expect(mockPaymentProviderService.createBillingPortalSession).toHaveBeenCalledWith(
      'paypal-customer',
      'https://public.example/return',
      'paypal'
    );
  });
});
