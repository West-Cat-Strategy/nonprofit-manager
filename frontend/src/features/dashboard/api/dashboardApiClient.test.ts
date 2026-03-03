import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import { DashboardApiClient } from './dashboardApiClient';

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches dashboards list', async () => {
    (api.get as any).mockResolvedValueOnce({ data: [{ id: 'dash-1' }] });

    const result = await client.fetchDashboards();

    expect(api.get).toHaveBeenCalledWith('/v2/dashboard/configs');
    expect(result).toEqual([{ id: 'dash-1' }]);
  });

  it('fetches a single dashboard by id', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { id: 'dash-2' } });

    const result = await client.fetchDashboard('dash-2');

    expect(api.get).toHaveBeenCalledWith('/v2/dashboard/configs/dash-2');
    expect(result).toEqual({ id: 'dash-2' });
  });

  it('fetches default dashboard', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { id: 'default' } });

    const result = await client.fetchDefaultDashboard();

    expect(api.get).toHaveBeenCalledWith('/v2/dashboard/configs/default');
    expect(result).toEqual({ id: 'default' });
  });

  it('creates a dashboard', async () => {
    const payload = { user_id: 'user-1', name: 'My Board', is_default: false, widgets: [], layout: [] };
    (api.post as any).mockResolvedValueOnce({ data: { id: 'dash-created', ...payload } });

    const result = await client.createDashboard(payload as any);

    expect(api.post).toHaveBeenCalledWith('/v2/dashboard/configs', payload);
    expect(result).toMatchObject({ id: 'dash-created', name: 'My Board' });
  });

  it('updates dashboard config', async () => {
    (api.put as any).mockResolvedValueOnce({ data: { id: 'dash-updated', name: 'Updated' } });

    const result = await client.updateDashboard('dash-updated', { name: 'Updated' });

    expect(api.put).toHaveBeenCalledWith('/v2/dashboard/configs/dash-updated', { name: 'Updated' });
    expect(result).toEqual({ id: 'dash-updated', name: 'Updated' });
  });

  it('deletes dashboard config', async () => {
    (api.delete as any).mockResolvedValueOnce(undefined);

    await client.deleteDashboard('dash-delete');

    expect(api.delete).toHaveBeenCalledWith('/v2/dashboard/configs/dash-delete');
  });

  it('saves dashboard layout', async () => {
    const layout = [{ i: 'widget-1', x: 0, y: 0, w: 2, h: 2 }];
    (api.put as any).mockResolvedValueOnce({ data: { id: 'dash-1', layout } });

    const result = await client.saveDashboardLayout('dash-1', layout);

    expect(api.put).toHaveBeenCalledWith('/v2/dashboard/configs/dash-1/layout', { layout });
    expect(result).toEqual({ id: 'dash-1', layout });
  });
});
