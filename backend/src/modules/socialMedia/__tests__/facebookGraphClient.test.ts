import { FacebookGraphClient } from '../services/facebookGraphClient';

const createFetchResponse = (payload: unknown, status: number = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(payload),
});

describe('FacebookGraphClient', () => {
  beforeEach(() => {
    (global as typeof globalThis & { fetch: jest.Mock }).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('normalizes Facebook page metrics into the application snapshot shape', async () => {
    const client = new FacebookGraphClient();
    const fetchMock = global.fetch as jest.Mock;

    fetchMock
      .mockResolvedValueOnce(
        createFetchResponse({
          id: 'fb-page-1',
          name: 'River District Volunteers',
          followers_count: 321,
        })
      )
      .mockResolvedValueOnce(
        createFetchResponse({
          summary: {
            total_count: 11,
          },
        })
      )
      .mockResolvedValueOnce(
        createFetchResponse({
          data: [{ values: [{ value: 654 }] }],
        })
      )
      .mockResolvedValueOnce(
        createFetchResponse({
          data: [{ values: [{ value: '987' }] }],
        })
      )
      .mockResolvedValueOnce(
        createFetchResponse({
          data: [{ values: [{ value: 42 }] }],
        })
      );

    const result = await client.fetchPageMetrics('fb-page-1', {
      appId: 'fb-app',
      appSecret: 'fb-secret',
      accessToken: 'user-token',
      pageAccessToken: 'page-token',
    });

    expect(result).toEqual({
      followers: 321,
      reach: 654,
      impressions: 987,
      engagedUsers: 42,
      postCount: 11,
      rawPayload: {
        page: {
          id: 'fb-page-1',
          name: 'River District Volunteers',
          followers_count: 321,
        },
        posts: {
          summary: {
            total_count: 11,
          },
        },
        insightAttempts: {
          reach: [{ metric: 'page_impressions_unique' }],
          impressions: [{ metric: 'page_impressions' }],
          engagedUsers: [{ metric: 'page_engaged_users' }],
        },
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
