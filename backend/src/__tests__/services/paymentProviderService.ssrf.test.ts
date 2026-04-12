jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../services/stripeService', () => ({
  __esModule: true,
  default: {
    createPaymentIntent: jest.fn(),
    getPaymentIntent: jest.fn(),
    cancelPaymentIntent: jest.fn(),
    createRefund: jest.fn(),
    createCustomer: jest.fn(),
    listPaymentMethods: jest.fn(),
    createSubscription: jest.fn(),
    getSubscription: jest.fn(),
    createBillingPortalSession: jest.fn(),
    constructWebhookEvent: jest.fn(),
    getCustomer: jest.fn(),
  },
}));

import { resolveSafePaymentProviderHostname } from '../../services/paymentProviderService';

describe('paymentProviderService SSRF guard', () => {
  it('blocks private IPv4 literals', async () => {
    await expect(resolveSafePaymentProviderHostname('127.0.0.1')).resolves.toEqual(
      expect.objectContaining({ ok: false, reason: 'IP address is not allowed' })
    );
  });

  it('blocks private IPv6 literals', async () => {
    await expect(resolveSafePaymentProviderHostname('fd00::1')).resolves.toEqual(
      expect.objectContaining({ ok: false, reason: 'IP address is not allowed' })
    );
  });

  it('allows public IPv4 literals', async () => {
    await expect(resolveSafePaymentProviderHostname('8.8.8.8')).resolves.toEqual(
      expect.objectContaining({ ok: true, addresses: ['8.8.8.8'] })
    );
  });
});
