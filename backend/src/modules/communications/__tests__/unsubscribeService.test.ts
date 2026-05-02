import { LocalUnsubscribeService, hashUnsubscribeEmail } from '../services/unsubscribeService';
import { createLocalUnsubscribeToken } from '../services/unsubscribeTokenService';

const runId = '11111111-1111-4111-8111-111111111111';
const recipientId = '22222222-2222-4222-8222-222222222222';
const contactId = '33333333-3333-4333-8333-333333333333';
const email = 'Person@Example.org';

const buildDb = () => ({
  query: jest.fn(),
});

const buildSuppressionRecorder = () => ({
  recordSuppressionEvidence: jest.fn(),
});

describe('LocalUnsubscribeService', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-32-characters!!';
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('records local email unsubscribe evidence for a valid token', async () => {
    const db = buildDb();
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: recipientId,
          campaign_run_id: runId,
          contact_id: contactId,
          email,
        },
      ],
    });
    const suppressionRecorder = buildSuppressionRecorder();
    suppressionRecorder.recordSuppressionEvidence.mockResolvedValueOnce({ id: 'suppression-1' });
    const token = createLocalUnsubscribeToken({
      v: 1,
      runId,
      recipientId,
      emailHash: hashUnsubscribeEmail(email),
    });

    const service = new LocalUnsubscribeService(db as never, suppressionRecorder);
    const result = await service.recordFromToken(token);

    expect(result).toEqual({ accepted: true });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("cr.provider = 'local_email'"), [
      recipientId,
      runId,
    ]);
    expect(suppressionRecorder.recordSuppressionEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId,
        channel: 'email',
        reason: 'unsubscribed',
        source: 'system',
        provider: 'local_email',
        providerEventId: `local-email-unsubscribe:${runId}:${recipientId}:${hashUnsubscribeEmail(email)}`,
        providerEventType: 'unsubscribe',
        providerReason: 'one_click_unsubscribe',
        preserveDoNotEmail: true,
      })
    );
  });

  it('uses deterministic provider events so repeated tokens are idempotent', async () => {
    const db = buildDb();
    db.query.mockResolvedValue({
      rows: [
        {
          id: recipientId,
          campaign_run_id: runId,
          contact_id: contactId,
          email,
        },
      ],
    });
    const suppressionRecorder = buildSuppressionRecorder();
    suppressionRecorder.recordSuppressionEvidence.mockResolvedValue({ id: 'suppression-1' });
    const token = createLocalUnsubscribeToken({
      v: 1,
      runId,
      recipientId,
      emailHash: hashUnsubscribeEmail(email),
    });

    const service = new LocalUnsubscribeService(db as never, suppressionRecorder);
    await service.recordFromToken(token);
    await service.recordFromToken(token);

    expect(suppressionRecorder.recordSuppressionEvidence).toHaveBeenCalledTimes(2);
    expect(suppressionRecorder.recordSuppressionEvidence.mock.calls[0][0].providerEventId).toBe(
      suppressionRecorder.recordSuppressionEvidence.mock.calls[1][0].providerEventId
    );
  });

  it('returns generic success and skips database work for invalid tokens', async () => {
    const db = buildDb();
    const suppressionRecorder = buildSuppressionRecorder();
    const service = new LocalUnsubscribeService(db as never, suppressionRecorder);

    const result = await service.recordFromToken('not-a-real-token');

    expect(result).toEqual({ accepted: true });
    expect(db.query).not.toHaveBeenCalled();
    expect(suppressionRecorder.recordSuppressionEvidence).not.toHaveBeenCalled();
  });

  it('does not leak when a valid token references no local recipient', async () => {
    const db = buildDb();
    db.query.mockResolvedValueOnce({ rows: [] });
    const suppressionRecorder = buildSuppressionRecorder();
    const token = createLocalUnsubscribeToken({
      v: 1,
      runId,
      recipientId,
      emailHash: hashUnsubscribeEmail(email),
    });

    const service = new LocalUnsubscribeService(db as never, suppressionRecorder);
    const result = await service.recordFromToken(token);

    expect(result).toEqual({ accepted: true });
    expect(suppressionRecorder.recordSuppressionEvidence).not.toHaveBeenCalled();
  });
});
