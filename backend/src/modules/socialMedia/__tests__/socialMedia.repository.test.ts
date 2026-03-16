jest.mock('@utils/encryption', () => ({
  encrypt: jest.fn((value: string) => `enc(${value})`),
}));

import type { Pool } from 'pg';
import { encrypt } from '@utils/encryption';
import { SocialMediaRepository } from '../repositories/socialMedia.repository';

const mockEncrypt = encrypt as jest.MockedFunction<typeof encrypt>;

const createPoolMock = (): jest.Mocked<Pick<Pool, 'query'>> => ({
  query: jest.fn(),
});

describe('SocialMediaRepository', () => {
  beforeEach(() => {
    mockEncrypt.mockClear();
  });

  it('encrypts app secret and access token once before upserting org settings', async () => {
    const pool = createPoolMock();
    const repository = new SocialMediaRepository(pool as unknown as Pool);
    const now = new Date().toISOString();

    pool.query
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'settings-1',
            organization_id: 'org-1',
            platform: 'facebook',
            app_id: 'fb-app',
            app_secret_encrypted: 'enc(secret-value)',
            access_token_encrypted: 'enc(token-value)',
            is_configured: true,
            last_tested_at: null,
            last_test_success: null,
            last_sync_at: null,
            last_sync_error: null,
            created_at: now,
            updated_at: now,
          },
        ],
      } as never);

    await repository.upsertOrgSettings(
      'org-1',
      'facebook',
      {
        appId: 'fb-app',
        appSecret: 'secret-value',
        accessToken: 'token-value',
      },
      'user-1'
    );

    expect(mockEncrypt).toHaveBeenCalledTimes(2);
    expect(mockEncrypt).toHaveBeenNthCalledWith(1, 'secret-value');
    expect(mockEncrypt).toHaveBeenNthCalledWith(2, 'token-value');

    const [, params] = pool.query.mock.calls[1];
    expect(params).toEqual([
      'org-1',
      'facebook',
      'fb-app',
      'enc(secret-value)',
      'enc(token-value)',
      true,
      'user-1',
    ]);
  });

  it('normalizes snapshot upserts to one row per day', async () => {
    const pool = createPoolMock();
    const repository = new SocialMediaRepository(pool as unknown as Pool);
    const now = new Date().toISOString();

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'snapshot-1',
          organization_id: 'org-1',
          page_id: 'page-1',
          platform: 'facebook',
          snapshot_date: '2026-03-15',
          followers: 100,
          reach: 240,
          impressions: 300,
          engaged_users: 18,
          post_count: 4,
          raw_payload: { source: 'facebook' },
          created_at: now,
          updated_at: now,
        },
      ],
    } as never);

    await repository.upsertDailySnapshot({
      organizationId: 'org-1',
      pageId: 'page-1',
      platform: 'facebook',
      snapshotDate: new Date('2026-03-15T18:42:00.000Z'),
      followers: 100,
      reach: 240,
      impressions: 300,
      engagedUsers: 18,
      postCount: 4,
      rawPayload: { source: 'facebook' },
    });

    const [, params] = pool.query.mock.calls[0];
    expect(params?.[3]).toBe('2026-03-15');
  });
});
