import express from 'express';
import type { Response } from 'express';
import request from 'supertest';

const reconciliationControllerMocks = {
  getReconciliationDashboard: jest.fn(
    (_req: unknown, res: Response) => res.status(200).json({ ok: true })
  ),
  createReconciliation: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getReconciliations: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getReconciliationById: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getReconciliationItems: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getReconciliationDiscrepancies: jest.fn(
    (_req: unknown, res: Response) => res.status(200).json({ ok: true })
  ),
  getAllDiscrepancies: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  manualMatch: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  resolveDiscrepancy: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  assignDiscrepancy: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
};

jest.mock('../../modules/reconciliation/controllers', () => reconciliationControllerMocks);
jest.mock('../../middleware/domains/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../middleware/requireActiveOrganizationContext', () => ({
  requireActiveOrganizationContext: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { createReconciliationRoutes } from '../../modules/reconciliation/routes';

const buildApp = (role: string) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: 'user-1', role, organizationId: 'org-1' };
    (req as any).organizationId = 'org-1';
    next();
  });
  app.use('/api/v2/reconciliation', createReconciliationRoutes());
  return app;
};

describe('reconciliation routes authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks dashboard access for non-finance roles', async () => {
    const app = buildApp('volunteer');

    await request(app).get('/api/v2/reconciliation/dashboard').expect(403);

    expect(reconciliationControllerMocks.getReconciliationDashboard).not.toHaveBeenCalled();
  });

  it('allows dashboard access for staff roles', async () => {
    const app = buildApp('staff');

    await request(app).get('/api/v2/reconciliation/dashboard').expect(200);

    expect(reconciliationControllerMocks.getReconciliationDashboard).toHaveBeenCalledTimes(1);
  });

  it('blocks manual matching for non-finance roles', async () => {
    const app = buildApp('volunteer');

    await request(app)
      .post('/api/v2/reconciliation/match')
      .send({
        donation_id: '11111111-1111-1111-1111-111111111111',
        stripe_payment_intent_id: 'pi_123',
      })
      .expect(403);

    expect(reconciliationControllerMocks.manualMatch).not.toHaveBeenCalled();
  });

  it('allows manual matching for manager roles', async () => {
    const app = buildApp('manager');

    await request(app)
      .post('/api/v2/reconciliation/match')
      .send({
        donation_id: '11111111-1111-4111-8111-111111111111',
        stripe_payment_intent_id: 'pi_1234567890',
      })
      .expect(200);

    expect(reconciliationControllerMocks.manualMatch).toHaveBeenCalledTimes(1);
  });
});
