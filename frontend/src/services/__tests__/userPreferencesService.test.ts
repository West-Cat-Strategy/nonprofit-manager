import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../api';
import {
  __resetUserPreferencesCacheForTests,
  getUserPreferencesCached,
  getUserTimezoneCached,
} from '../userPreferencesService';

describe('userPreferencesService cache behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetUserPreferencesCacheForTests();
  });

  it('reuses cached preferences within ttl', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        preferences: {
          timezone: 'America/Vancouver',
        },
      },
    });

    await getUserPreferencesCached();
    await getUserPreferencesCached();

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent preference fetches', async () => {
    let resolveRequest: ((value: unknown) => void) | null = null;
    vi.mocked(api.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }) as Promise<never>
    );

    const first = getUserPreferencesCached();
    const second = getUserPreferencesCached();

    resolveRequest?.({
      data: {
        preferences: {
          organization: {
            timezone: 'America/Toronto',
          },
        },
      },
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(secondResult);
  });

  it('returns fallback timezone when preferences endpoint fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('boom'));

    const timezone = await getUserTimezoneCached('UTC');
    expect(timezone).toBe('UTC');
  });
});
