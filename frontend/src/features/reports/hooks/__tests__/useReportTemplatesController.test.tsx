import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useReportTemplatesController from '../useReportTemplatesController';

const { listTemplatesMock } = vi.hoisted(() => ({
  listTemplatesMock: vi.fn(),
}));

vi.mock('../../api/reportsApiClient', () => ({
  reportsApiClient: {
    createExportJob: vi.fn(),
    downloadExportJob: vi.fn(),
    fetchAvailableFields: vi.fn(),
    fetchWorkflowCoverageReport: vi.fn(),
    generateReport: vi.fn(),
    getExportJob: vi.fn(),
    instantiateTemplate: vi.fn(),
    listTemplates: listTemplatesMock,
  },
}));

describe('useReportTemplatesController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTemplatesMock.mockResolvedValue([
      {
        id: 'tpl-1',
        name: 'Fundraising KPI',
        description: 'Fundraising template',
        category: 'fundraising',
        tags: ['kpi'],
        entity: 'donations',
        template_definition: {
          name: 'Fundraising KPI',
          entity: 'donations',
          fields: ['amount'],
          filters: [],
          sort: [],
          groupBy: [],
          aggregations: [],
        },
        is_system: true,
        created_at: '2026-03-15T12:00:00.000Z',
        updated_at: '2026-03-15T12:00:00.000Z',
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads templates once without render-driven refetches', async () => {
    const { result } = renderHook(() => useReportTemplatesController('fundraising'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listTemplatesMock).toHaveBeenCalledTimes(1);
    expect(listTemplatesMock).toHaveBeenCalledWith({ category: 'fundraising' });
  });
});
