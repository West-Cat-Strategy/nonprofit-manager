import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import { DashboardApiClient } from './dashboardApiClient';
import type { DashboardConfig, WidgetLayout } from '../types/contracts';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('DashboardApiClient', () => {
  const client = new DashboardApiClient();
  const mockedApi = api as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches dashboards list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 'dash-1' }] });

    const result = await client.fetchDashboards();

    expect(api.get).toHaveBeenCalledWith('/v2/dashboard/configs');
    expect(result).toEqual([{ id: 'dash-1' }]);
  });

  it('fetches a single dashboard by id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { id: 'dash-2' } });

    const result = await client.fetchDashboard('dash-2');

    expect(api.get).toHaveBeenCalledWith('/v2/dashboard/configs/dash-2');
    expect(result).toEqual({ id: 'dash-2' });
  });

  it('fetches default dashboard', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { id: 'default' } });

    const result = await client.fetchDefaultDashboard();

    expect(api.get).toHaveBeenCalledWith('/v2/dashboard/configs/default');
    expect(result).toEqual({ id: 'default' });
  });

  it('creates a dashboard', async () => {
    const payload: Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'> = {
      user_id: 'user-1',
      name: 'My Board',
      is_default: false,
      widgets: [],
      layout: [],
    };
    mockedApi.post.mockResolvedValueOnce({ data: { id: 'dash-created', ...payload } });

    const result = await client.createDashboard(payload);

    expect(api.post).toHaveBeenCalledWith('/v2/dashboard/configs', payload);
    expect(result).toMatchObject({ id: 'dash-created', name: 'My Board' });
  });

  it('updates dashboard config', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { id: 'dash-updated', name: 'Updated' } });

    const result = await client.updateDashboard('dash-updated', { name: 'Updated' });

    expect(api.put).toHaveBeenCalledWith('/v2/dashboard/configs/dash-updated', { name: 'Updated' });
    expect(result).toEqual({ id: 'dash-updated', name: 'Updated' });
  });

  it('deletes dashboard config', async () => {
    mockedApi.delete.mockResolvedValueOnce(undefined);

    await client.deleteDashboard('dash-delete');

    expect(api.delete).toHaveBeenCalledWith('/v2/dashboard/configs/dash-delete');
  });

  it('saves dashboard layout', async () => {
    const layout: WidgetLayout[] = [{ i: 'widget-1', x: 0, y: 0, w: 2, h: 2 }];
    mockedApi.put.mockResolvedValueOnce({ data: { id: 'dash-1', layout } });

    const result = await client.saveDashboardLayout('dash-1', layout);

    expect(api.put).toHaveBeenCalledWith('/v2/dashboard/configs/dash-1/layout', { layout });
    expect(result).toEqual({ id: 'dash-1', layout });
  });
});
