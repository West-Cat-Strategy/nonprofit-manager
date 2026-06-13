import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import { queueViewsApiClient } from './queueViewsApiClient';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('queueViewsApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: { success: true, data: [] } });
    mockApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'queue-view-1',
          surface: 'cases',
          name: 'My queue',
        },
      },
    });
    mockApi.delete.mockResolvedValue({ data: { success: true, data: null } });
  });

  it('passes portal surfaces as query params when listing shared portal queue views', async () => {
    await queueViewsApiClient.listQueueViews('portal_appointments');

    expect(mockApi.get).toHaveBeenCalledWith('/v2/portal-admin/queue-views', {
      params: { surface: 'portal_appointments' },
    });
  });

  it('strips the routing surface from case queue view save payloads', async () => {
    await queueViewsApiClient.saveQueueView({
      id: 'queue-view-1',
      surface: 'cases',
      name: 'High risk cases',
      filters: { risk: 'high' },
      columns: ['name'],
      sort: { field: 'updatedAt', direction: 'desc' },
      rowLimit: 25,
      dashboardBehavior: { pin: true },
      permissionScope: ['cases.view'],
    });

    expect(mockApi.post).toHaveBeenCalledWith('/v2/cases/queue-views', {
      id: 'queue-view-1',
      name: 'High risk cases',
      filters: { risk: 'high' },
      columns: ['name'],
      sort: { field: 'updatedAt', direction: 'desc' },
      rowLimit: 25,
      dashboardBehavior: { pin: true },
      permissionScope: ['cases.view'],
    });
    expect(mockApi.post.mock.calls[0][1]).not.toHaveProperty('surface');
  });

  it('preserves portal queue view surface in save and archive requests', async () => {
    const payload = {
      surface: 'portal_conversations' as const,
      name: 'Unread portal conversations',
      filters: { unread: true },
    };

    await queueViewsApiClient.saveQueueView(payload);
    await queueViewsApiClient.archiveQueueView('portal_conversations', 'queue-view-1');

    expect(mockApi.post).toHaveBeenCalledWith('/v2/portal-admin/queue-views', payload);
    expect(mockApi.delete).toHaveBeenCalledWith('/v2/portal-admin/queue-views/queue-view-1', {
      params: { surface: 'portal_conversations' },
    });
  });
});
