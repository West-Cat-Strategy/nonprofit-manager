import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSavedCaseViews } from '../useSavedCaseViews';

const listQueueViewsMock = vi.fn();

vi.mock('../../../queueViews/api/queueViewsApiClient', () => ({
  queueViewsApiClient: {
    listQueueViews: (...args: unknown[]) => listQueueViewsMock(...args),
    saveQueueView: vi.fn(),
    archiveQueueView: vi.fn(),
  },
}));

const defaultArgs = {
  filters: { page: 1, limit: 20 },
  searchTerm: '',
  selectedPriority: '',
  selectedStatus: '',
  selectedType: '',
  showUrgentOnly: false,
  showImportedOnly: false,
  selectedSort: 'created_at',
  selectedOrder: 'desc' as const,
  quickFilter: 'all' as const,
  dueSoonDays: 7,
  applyFilters: vi.fn(),
};

describe('useSavedCaseViews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('merges device-local saved views with server-backed views', async () => {
    localStorage.setItem(
      'cases.savedViews',
      JSON.stringify([
        {
          id: 'local-view',
          name: 'Local review queue',
          quickFilter: 'all',
          filters: { search: 'local', limit: 20 },
        },
      ])
    );
    listQueueViewsMock.mockResolvedValue([
      {
        id: 'server-view',
        name: 'Server urgent queue',
        filters: { search: 'server', quick_filter: 'urgent' },
        sort: { sort_by: 'created_at', sort_order: 'desc' },
        rowLimit: 50,
      },
    ]);

    const { result } = renderHook(() => useSavedCaseViews(defaultArgs));

    await waitFor(() => expect(result.current.savedViewsLoading).toBe(false));

    expect(result.current.savedViews.map((view) => view.id)).toEqual(['local-view', 'server-view']);
    expect(result.current.savedViews[1]).toEqual(
      expect.objectContaining({
        id: 'server-view',
        serverBacked: true,
        quickFilter: 'urgent',
      })
    );
    expect(JSON.parse(localStorage.getItem('cases.savedViews') || '[]')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'local-view' }),
        expect.objectContaining({ id: 'server-view', serverBacked: true }),
      ])
    );
  });
});
