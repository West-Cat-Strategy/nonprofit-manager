jest.mock('@config/database', () => ({
  query: jest.fn(),
}));

jest.mock('@config/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

import pool from '@config/database';
import { createLocalCampaignBrowserViewToken } from '../services/browserViewTokenService';
import { renderLocalCampaignBrowserViewFromToken } from '../services/localCampaignBrowserViewService';

const mockPool = pool as jest.Mocked<typeof pool>;
const runId = '11111111-1111-4111-8111-111111111111';

describe('localCampaignBrowserViewService', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret-with-32-characters!!';
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('renders a local campaign content snapshot with generic merge placeholders', async () => {
    const token = createLocalCampaignBrowserViewToken({
      v: 1,
      runId,
      provider: 'local_email',
    });
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: runId,
          content_snapshot: {
            subject: 'Spring Update',
            html: '<!doctype html><html><head><title>Spring</title></head><body><p>Hello {{first_name}} {{custom_status}}</p><p>*|LNAME|*</p></body></html>',
          },
        },
      ],
      rowCount: 1,
    });

    const html = await renderLocalCampaignBrowserViewFromToken(token);

    expect(html).toContain('Hello First name Custom status');
    expect(html).toContain('<p>Last name</p>');
    expect(html).toContain('noindex,nofollow');
    expect(html).not.toContain('{{first_name}}');
    expect(html).not.toContain('*|LNAME|*');
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("provider = 'local_email'"), [
      runId,
    ]);
  });

  it('returns a generic unavailable page without querying when the token is invalid', async () => {
    const html = await renderLocalCampaignBrowserViewFromToken('not-a-valid-token');

    expect(html).toContain('Email unavailable');
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('keeps missing or empty snapshots generic without leaking run existence', async () => {
    const token = createLocalCampaignBrowserViewToken({
      v: 1,
      runId,
      provider: 'local_email',
    });
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const html = await renderLocalCampaignBrowserViewFromToken(token);

    expect(html).toContain('Email unavailable');
    expect(html).not.toContain(runId);
  });
});
