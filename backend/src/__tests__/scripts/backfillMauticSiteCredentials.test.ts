import { backfillMauticSiteCredentials } from '../../../scripts/backfill-mautic-site-credentials';

describe('backfillMauticSiteCredentials', () => {
  it('encrypts legacy JSON Mautic passwords and removes the plaintext JSON key', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            site_id: 'site-1',
            mautic_config: {
              baseUrl: 'https://mautic.example.org',
              username: 'api-user',
              password: 'legacy-secret',
            },
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await backfillMauticSiteCredentials({ query });

    expect(result).toEqual({ migrated: 1, dryRun: false });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[0]).toContain("mautic_config = COALESCE(mautic_config, '{}'::jsonb) - 'password'");
    expect(query.mock.calls[1]?.[1]?.[0]).toEqual(expect.any(String));
    expect(query.mock.calls[1]?.[1]?.[0]).not.toBe('legacy-secret');
    expect(query.mock.calls[1]?.[1]?.[1]).toBe('site-1');
  });

  it('reports dry-run candidates without updating rows', async () => {
    const query = jest.fn().mockResolvedValueOnce({
      rows: [
        {
          site_id: 'site-1',
          mautic_config: { password: 'legacy-secret' },
        },
      ],
    });

    const result = await backfillMauticSiteCredentials({ query }, { dryRun: true });

    expect(result).toEqual({ migrated: 1, dryRun: true });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
