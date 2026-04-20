import express from 'express';
import request from 'supertest';
import { cancelPaymentIntent, createPaymentIntent, getPaymentIntent, setPaymentPool } from '../../modules/payments/controllers/paymentController';
import paymentProviderService from '@services/paymentProviderService';
import { requireActiveOrganizationSafe } from '@services/authGuardService';

jest.mock('@services/paymentProviderService', () => ({
  __esModule: true,
  default: {
    getPaymentConfig: jest.fn(() => ({ defaultProvider: 'stripe' })),
    getPaymentIntent: jest.fn(),
    cancelPaymentIntent: jest.fn(),
    createPaymentIntent: jest.fn(),
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

  const buildApp = (user?: any, portalUser?: any, organizationId?: string) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      if (user) (req as any).user = user;
      if (portalUser) (req as any).portalUser = portalUser;
      if (organizationId) (req as any).organizationId = organizationId;
      next();
    });
    app.get('/api/v2/payments/intents/:id', getPaymentIntent);
    app.post('/api/v2/payments/intents/:id/cancel', cancelPaymentIntent);
    app.post('/api/v2/payments/intents', createPaymentIntent);
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

    const app = buildApp({ id: 'user-1' }, null, 'org-a');

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

    const app = buildApp({ id: 'user-1' }, null, 'org-a');

    const response = await request(app).post('/api/v2/payments/intents/pi_test_123/cancel').expect(200);

    expect(response.body.success).toBe(true);
    expect(mockPaymentProviderService.cancelPaymentIntent).toHaveBeenCalledWith('pi_test_123', 'stripe');
  });

  describe('createPaymentIntent ownership', () => {
    it('blocks intent creation when the donation belongs to another organization', async () => {
      mockRequireActiveOrganizationSafe.mockResolvedValue({
        ok: true,
        data: {
          user: { id: 'user-1' },
          organizationId: 'org-a',
        },
      } as any);
      // First query for donation ownership
      paymentPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const app = buildApp({ id: 'user-1' }, null, 'org-a');

      const response = await request(app)
        .post('/api/v2/payments/intents')
        .send({ amount: 1000, donationId: 'donation-other' })
        .expect(403);

      expect(response.body.error.message).toContain('access to this donation');
    });

    it('allows intent creation when the donation belongs to the user organization', async () => {
      mockRequireActiveOrganizationSafe.mockResolvedValue({
        ok: true,
        data: {
          user: { id: 'user-1' },
          organizationId: 'org-a',
        },
      } as any);
      // First query for donation ownership
      paymentPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donation-1' }] });
      
      mockPaymentProviderService.createPaymentIntent.mockResolvedValueOnce({
        id: 'pi_new_123',
        status: 'requires_payment_method',
      } as any);

      const app = buildApp({ id: 'user-1' }, null, 'org-a');

      await request(app)
        .post('/api/v2/payments/intents')
        .send({ amount: 1000, donationId: 'donation-1' })
        .expect(201);

      expect(mockPaymentProviderService.createPaymentIntent).toHaveBeenCalled();
    });

    it('allows intent creation for portal users with contact ownership', async () => {
      // Mock organization resolution to fail to trigger portal check
      mockRequireActiveOrganizationSafe.mockResolvedValue({
        ok: false,
        error: { code: 'bad_request', message: 'No org' }
      } as any);

      // First query for donation ownership (contact check)
      paymentPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donation-1' }] });
      
      mockPaymentProviderService.createPaymentIntent.mockResolvedValueOnce({
        id: 'pi_portal_123',
        status: 'requires_payment_method',
      } as any);

      const app = buildApp(null, { contactId: 'contact-1' });

      await request(app)
        .post('/api/v2/payments/intents')
        .send({ amount: 1000, donationId: 'donation-1' })
        .expect(201);

      expect(paymentPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND contact_id = $2'),
        ['donation-1', 'contact-1']
      );
    });
  });
});
