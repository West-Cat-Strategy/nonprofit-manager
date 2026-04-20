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
    listTemplatesMock.mockImplementation((params?: { category?: string }) =>
      Promise.resolve(
        params?.category === 'fundraising'
          ? [
              {
                id: 'tpl-1',
                name: 'Fundraising KPI',
                description: 'Fundraising template',
                category: 'fundraising',
                tags: ['fundraising-cadence', 'board-pack'],
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
              {
                id: 'tpl-2',
                name: 'Campaign Snapshot',
                description: 'Campaign template',
                category: 'fundraising',
                tags: ['campaign'],
                entity: 'donations',
                template_definition: {
                  name: 'Campaign Snapshot',
                  entity: 'donations',
                  fields: ['campaign'],
                  filters: [],
                  sort: [],
                  groupBy: [],
                  aggregations: [],
                },
                is_system: true,
                created_at: '2026-03-15T12:00:00.000Z',
                updated_at: '2026-03-15T12:00:00.000Z',
              },
            ]
          : [
              {
                id: 'tpl-1',
                name: 'Fundraising KPI',
                description: 'Fundraising template',
                category: 'fundraising',
                tags: ['fundraising-cadence', 'board-pack'],
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
              {
                id: 'tpl-2',
                name: 'Campaign Snapshot',
                description: 'Campaign template',
                category: 'fundraising',
                tags: ['campaign'],
                entity: 'donations',
                template_definition: {
                  name: 'Campaign Snapshot',
                  entity: 'donations',
                  fields: ['campaign'],
                  filters: [],
                  sort: [],
                  groupBy: [],
                  aggregations: [],
                },
                is_system: true,
                created_at: '2026-03-15T12:00:00.000Z',
                updated_at: '2026-03-15T12:00:00.000Z',
              },
              {
                id: 'tpl-3',
                name: 'Board Packet Rollup',
                description: 'Board summary template',
                category: 'operations',
                tags: ['board-pack'],
                entity: 'accounts',
                template_definition: {
                  name: 'Board Packet Rollup',
                  entity: 'accounts',
                  fields: ['name'],
                  filters: [],
                  sort: [],
                  groupBy: [],
                  aggregations: [],
                },
                is_system: true,
                created_at: '2026-03-15T12:00:00.000Z',
                updated_at: '2026-03-15T12:00:00.000Z',
              },
            ]
      )
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads category-scoped templates once without render-driven refetches', async () => {
    const { result } = renderHook(() =>
      useReportTemplatesController({
        category: 'fundraising',
        tag: 'fundraising-cadence',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listTemplatesMock).toHaveBeenCalledTimes(1);
    expect(listTemplatesMock).toHaveBeenCalledWith({ category: 'fundraising' });
    expect(result.current.filteredTemplates.map((template) => template.id)).toEqual(['tpl-1']);
    expect(result.current.availableTags).toEqual(['board-pack', 'campaign', 'fundraising-cadence']);
  });

  it('filters matching templates by tag when no category is provided', async () => {
    const { result } = renderHook(() =>
      useReportTemplatesController({
        category: '',
        tag: 'board-pack',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listTemplatesMock).toHaveBeenCalledTimes(1);
    expect(listTemplatesMock).toHaveBeenCalledWith(undefined);
    expect(result.current.filteredTemplates.map((template) => template.id)).toEqual([
      'tpl-1',
      'tpl-3',
    ]);
  });
});
