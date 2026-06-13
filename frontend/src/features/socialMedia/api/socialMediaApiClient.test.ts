import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import { socialMediaApiClient } from './socialMediaApiClient';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('socialMediaApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the Facebook settings endpoints for credential reads, writes, and tests', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { appId: 'fb-app' } });
    mockApi.put.mockResolvedValueOnce({ data: { appId: 'fb-app-next' } });
    mockApi.post.mockResolvedValueOnce({ data: { success: true } });

    await socialMediaApiClient.getFacebookSettings();
    await socialMediaApiClient.updateFacebookSettings({
      appId: 'fb-app-next',
      accessToken: 'token',
    });
    await socialMediaApiClient.testFacebookSettings();

    expect(mockApi.get).toHaveBeenCalledWith('/social-media/facebook/settings');
    expect(mockApi.put).toHaveBeenCalledWith('/social-media/facebook/settings', {
      appId: 'fb-app-next',
      accessToken: 'token',
    });
    expect(mockApi.post).toHaveBeenCalledWith('/social-media/facebook/settings/test');
  });

  it('unwraps page collection endpoints and forwards snapshot limits', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { pages: [{ id: 'page-1' }], discoveredCount: 1 },
    });
    mockApi.get
      .mockResolvedValueOnce({ data: { pages: [{ id: 'page-2' }] } })
      .mockResolvedValueOnce({ data: { snapshots: [{ id: 'snapshot-1' }] } });

    await expect(socialMediaApiClient.discoverFacebookPages()).resolves.toEqual([
      { id: 'page-1' },
    ]);
    await expect(socialMediaApiClient.listFacebookPages()).resolves.toEqual([
      { id: 'page-2' },
    ]);
    await expect(socialMediaApiClient.getFacebookPageSnapshots('page-2', 7)).resolves.toEqual([
      { id: 'snapshot-1' },
    ]);

    expect(mockApi.post).toHaveBeenCalledWith('/social-media/facebook/pages/discover');
    expect(mockApi.get).toHaveBeenCalledWith('/social-media/facebook/pages');
    expect(mockApi.get).toHaveBeenCalledWith(
      '/social-media/facebook/pages/page-2/snapshots?limit=7'
    );
  });
});
