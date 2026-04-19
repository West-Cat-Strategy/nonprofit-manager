import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import { GrantsApiClient } from './grantsApiClient';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('GrantsApiClient', () => {
  const client = new GrantsApiClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses resource-relative grant endpoints for summary and list calls', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { total_funders: 3 } } as never)
      .mockResolvedValueOnce({ data: { data: [], pagination: { page: 1, limit: 25, total: 0, total_pages: 0 } } } as never);

    await client.getSummary({ fiscal_year: '2026' });
    await client.listFunders({ status: 'active' });

    expect(api.get).toHaveBeenNthCalledWith(1, '/grants/summary', {
      params: { fiscal_year: '2026' },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/grants/funders', {
      params: { status: 'active' },
    });
  });

  it('uses resource-relative mutation and export endpoints', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'grant-1' } } as never);
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { id: 'application-1' } } as never);
    vi.mocked(api.get).mockResolvedValueOnce({ data: new Blob(['csv']) } as never);

    await client.createFunder({ name: 'Alpha Funder', jurisdiction: 'federal' });
    await client.updateApplicationStatus('application-1', { status: 'submitted' });
    await client.exportGrants({ funder_id: 'funder-1' }, 'csv');

    expect(api.post).toHaveBeenNthCalledWith(1, '/grants/funders', {
      name: 'Alpha Funder',
      jurisdiction: 'federal',
    });
    expect(api.patch).toHaveBeenCalledWith('/grants/applications/application-1/status', {
      status: 'submitted',
    });
    expect(api.get).toHaveBeenCalledWith('/grants/export', {
      params: { funder_id: 'funder-1', format: 'csv' },
      responseType: 'blob',
    });
  });
});
