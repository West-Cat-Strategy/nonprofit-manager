import express from 'express';
import type { Response } from 'express';
import request from 'supertest';

const paymentControllerMocks = {
  getPaymentConfig: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  createPaymentIntent: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getPaymentIntent: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  cancelPaymentIntent: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  createRefund: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  createCustomer: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getCustomer: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  listPaymentMethods: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  handleWebhook: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
};

jest.mock('../../modules/payments/controllers', () => paymentControllerMocks);
jest.mock('../../middleware/domains/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { createPaymentsRoutes } from '../../modules/payments/routes';

const buildApp = (role: string) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: 'user-1', role };
    next();
  });
  app.use('/api/v2/payments', createPaymentsRoutes());
  return app;
};

describe('payments routes authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks refund creation for non-finance roles', async () => {
    const app = buildApp('volunteer');

    await request(app)
      .post('/api/v2/payments/refunds')
      .send({ paymentIntentId: 'pi_test_123', provider: 'stripe' })
      .expect(403);

    expect(paymentControllerMocks.createRefund).not.toHaveBeenCalled();
  });

  it('allows refund creation for staff roles', async () => {
    const app = buildApp('staff');

    await request(app)
      .post('/api/v2/payments/refunds')
      .send({ paymentIntentId: 'pi_test_123', provider: 'stripe' })
      .expect(200);

    expect(paymentControllerMocks.createRefund).toHaveBeenCalledTimes(1);
  });

  it('blocks customer management for non-finance roles', async () => {
    const app = buildApp('volunteer');

    await request(app)
      .post('/api/v2/payments/customers')
      .send({ email: 'donor@example.org', provider: 'stripe' })
      .expect(403);

    expect(paymentControllerMocks.createCustomer).not.toHaveBeenCalled();
  });

  it('allows customer management for staff roles', async () => {
    const app = buildApp('manager');

    await request(app)
      .post('/api/v2/payments/customers')
      .send({ email: 'donor@example.org', provider: 'stripe' })
      .expect(200);

    expect(paymentControllerMocks.createCustomer).toHaveBeenCalledTimes(1);
  });
});
