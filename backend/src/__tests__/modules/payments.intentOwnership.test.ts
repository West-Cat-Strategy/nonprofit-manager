import express from 'express';
import request from 'supertest';
import { cancelPaymentIntent, getPaymentIntent, setPaymentPool } from '../../modules/payments/controllers/paymentController';
import paymentProviderService from '@services/paymentProviderService';
import { requireActiveOrganizationSafe } from '@services/authGuardService';

jest.mock('@services/paymentProviderService', () => ({
  __esModule: true,
  default: {
    getPaymentConfig: jest.fn(() => ({ defaultProvider: 'stripe' })),
    getPaymentIntent: jest.fn(),
    cancelPaymentIntent: jest.fn(),
  },
}));

jest.mock('@services/authGuardService', () => ({
  requireActiveOrganizationSafe: jest.fn(),
}));

const mockPaymentProviderService = paymentProviderService as jest.Mocked<typeof paymentProviderService>;
const mockRequireActiveOrganizationSafe = requireActiveOrganizationSafe as jest.MockedFunction<
  typeof requireActiveOrganizationSafe
>;

describe('payments intent ownership enforcement', () => {
  const paymentPool = { query: jest.fn() };

  beforeAll(() => {
    setPaymentPool(paymentPool as any);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.get('/api/v2/payments/intents/:id', getPaymentIntent);
    app.post('/api/v2/payments/intents/:id/cancel', cancelPaymentIntent);
    return app;
  };

  it('returns not found when the intent belongs to another organization', async () => {
    mockRequireActiveOrganizationSafe.mockResolvedValue({
      ok: true,
      data: {
        user: { id: 'user-1' },
        organizationId: 'org-a',
      },
    } as any);
    paymentPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = buildApp();

    const response = await request(app).get('/api/v2/payments/intents/pi_test_123').expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'not_found',
      },
    });
    expect(mockPaymentProviderService.getPaymentIntent).not.toHaveBeenCalled();
  });

  it('cancels an intent after the ownership guard passes', async () => {
    mockRequireActiveOrganizationSafe.mockResolvedValue({
      ok: true,
      data: {
        user: { id: 'user-1' },
        organizationId: 'org-a',
      },
    } as any);
    paymentPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ donation_id: 'donation-1' }] });
    mockPaymentProviderService.cancelPaymentIntent.mockResolvedValue({
      id: 'pi_test_123',
      provider: 'stripe',
      clientSecret: null,
      amount: 500,
      currency: 'usd',
      status: 'canceled',
      created: new Date('2026-04-18T00:00:00Z'),
      providerTransactionId: 'pi_test_123',
      providerCheckoutSessionId: 'pi_test_123',
    } as any);

    const app = buildApp();

    const response = await request(app).post('/api/v2/payments/intents/pi_test_123/cancel').expect(200);

    expect(response.body.success).toBe(true);
    expect(mockPaymentProviderService.cancelPaymentIntent).toHaveBeenCalledWith('pi_test_123', 'stripe');
  });
});
