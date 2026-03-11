import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../api';
import {
  __resetBrandingCacheForTests,
  getBrandingCached,
  invalidateBrandingCache,
} from '../brandingService';

describe('brandingService cache behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetBrandingCacheForTests();
  });

  it('reuses cached branding within ttl', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        appName: 'West Cat',
        appIcon: null,
        primaryColour: '#123456',
        secondaryColour: '#654321',
        favicon: null,
      },
    });

    const first = await getBrandingCached();
    const second = await getBrandingCached();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('invalidates cached branding and refetches on the next read', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          appName: 'West Cat',
          appIcon: null,
          primaryColour: '#123456',
          secondaryColour: '#654321',
          favicon: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          appName: 'West Cat Foundation',
          appIcon: null,
          primaryColour: '#111111',
          secondaryColour: '#222222',
          favicon: null,
        },
      });

    const first = await getBrandingCached();
    invalidateBrandingCache();
    const second = await getBrandingCached();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(first.appName).toBe('West Cat');
    expect(second.appName).toBe('West Cat Foundation');
  });
});
