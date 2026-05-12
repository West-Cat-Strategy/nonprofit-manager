jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('dns/promises', () => ({
  __esModule: true,
  default: {
    lookup: jest.fn(),
  },
  lookup: jest.fn(),
}));

import dns from 'dns/promises';
import pool from '@config/database';
import * as mauticService from '@services/mauticService';

const mockLookup = dns.lookup as jest.Mock;
const mockPool = pool as unknown as { query: jest.Mock };
const fetchMock = jest.fn();
const originalFetch = global.fetch;

const siteMauticConfig = {
  baseUrl: 'https://mautic.example.org/app/',
  username: 'site-api',
  password: 'site-secret',
};

const clearMauticEnv = () => {
  delete process.env.MAUTIC_BASE_URL;
  delete process.env.MAUTIC_USERNAME;
  delete process.env.MAUTIC_PASSWORD;
};

const mockMauticJsonResponse = (payload: unknown) => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
  });
};

describe('mauticService scoped configuration', () => {
  beforeEach(() => {
    clearMauticEnv();
    mockLookup.mockReset();
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    mockPool.query.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    clearMauticEnv();
  });

  it('treats complete site-scoped settings as configured without env-backed settings', () => {
    expect(mauticService.isMauticConfigured()).toBe(false);
    expect(mauticService.isMauticConfigured(siteMauticConfig)).toBe(true);
  });

  it('uses site-scoped settings for Mautic segment fetches', async () => {
    mockMauticJsonResponse({
      segments: [{ id: 42, name: 'Website Newsletter', contacts: 12 }],
    });

    const segments = await mauticService.getSegments(siteMauticConfig);

    expect(segments).toEqual([
      {
        id: '42',
        name: 'Website Newsletter',
        memberCount: 12,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mautic.example.org/app/api/segments?limit=100',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('site-api:site-secret').toString('base64')}`,
        }),
      })
    );
  });

  it('falls back to env-backed settings when site-scoped settings are incomplete', async () => {
    process.env.MAUTIC_BASE_URL = 'https://env-mautic.example.org';
    process.env.MAUTIC_USERNAME = 'env-api';
    process.env.MAUTIC_PASSWORD = 'env-secret';
    mockMauticJsonResponse({
      segments: [{ id: 'env-segment', name: 'Env Newsletter', member_count: 3 }],
    });

    const status = await mauticService.getStatus({});

    expect(status).toEqual({
      configured: true,
      baseUrl: 'https://env-mautic.example.org',
      segmentCount: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://env-mautic.example.org/api/segments?limit=100',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('env-api:env-secret').toString('base64')}`,
        }),
      })
    );
  });

  it('fails closed for unsafe complete site-scoped base URLs instead of using env fallback', async () => {
    process.env.MAUTIC_BASE_URL = 'https://env-mautic.example.org';
    process.env.MAUTIC_USERNAME = 'env-api';
    process.env.MAUTIC_PASSWORD = 'env-secret';

    const unsafeConfig = {
      baseUrl: 'http://localhost:8080',
      username: 'site-api',
      password: 'site-secret',
    };

    expect(mauticService.isMauticConfigured(unsafeConfig)).toBe(false);
    await expect(mauticService.getSegments(unsafeConfig)).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks resolved private hosts before fetching', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '10.0.0.12', family: 4 }]);

    await expect(
      mauticService.getSegments({
        baseUrl: 'https://internal-mautic.example.org',
        username: 'site-api',
        password: 'site-secret',
      })
    ).rejects.toThrow('Mautic base URL is not allowed');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
