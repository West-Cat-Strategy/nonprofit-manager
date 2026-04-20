import express from 'express';
import type { Response } from 'express';
import request from 'supertest';

const meetingsControllerMocks = {
  listCommittees: jest.fn((_req: unknown, res: Response) => res.status(200).json({ committees: [] })),
  listMeetings: jest.fn((_req: unknown, res: Response) => res.status(200).json({ meetings: [] })),
  getMeetingDetail: jest.fn((_req: unknown, res: Response) => res.status(200).json({ meeting: {} })),
  createMeeting: jest.fn((_req: unknown, res: Response) => res.status(201).json({ meeting: {} })),
  updateMeeting: jest.fn((_req: unknown, res: Response) => res.status(200).json({ meeting: {} })),
  addAgendaItem: jest.fn((_req: unknown, res: Response) => res.status(201).json({ agendaItem: {} })),
  reorderAgenda: jest.fn((_req: unknown, res: Response) => res.status(204).send()),
  addMotion: jest.fn((_req: unknown, res: Response) => res.status(201).json({ motion: {} })),
  updateMotion: jest.fn((_req: unknown, res: Response) => res.status(200).json({ motion: {} })),
  createActionItem: jest.fn((_req: unknown, res: Response) => res.status(201).json({ actionItem: {} })),
  getMinutesDraft: jest.fn((_req: unknown, res: Response) => res.status(200).json({ markdown: '# Draft' })),
};

jest.mock('../controllers', () => meetingsControllerMocks);
jest.mock('@middleware/domains/auth', () => {
  const actual = jest.requireActual('@middleware/domains/auth');
  return {
    ...actual,
    authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

import { createMeetingsRoutes } from '../routes';

const buildApp = (role?: string) => {
  const app = express();
  app.use(express.json());

  if (role) {
    app.use((req, _res, next) => {
      (req as { user?: { id: string; role: string } }).user = { id: 'user-1', role };
      next();
    });
  }

  app.use('/api/v2/meetings', createMeetingsRoutes());
  return app;
};

describe('meetings routes authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated meetings access', async () => {
    const app = buildApp();

    const response = await request(app).get('/api/v2/meetings/committees').expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe('unauthorized');
    expect(meetingsControllerMocks.listCommittees).not.toHaveBeenCalled();
  });

  it('rejects viewer meetings access', async () => {
    const app = buildApp('viewer');

    const response = await request(app).get('/api/v2/meetings/committees').expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe('forbidden');
    expect(meetingsControllerMocks.listCommittees).not.toHaveBeenCalled();
  });

  it('allows manager meetings access', async () => {
    const app = buildApp('manager');

    await request(app).get('/api/v2/meetings/committees').expect(200);

    expect(meetingsControllerMocks.listCommittees).toHaveBeenCalledTimes(1);
  });
});
