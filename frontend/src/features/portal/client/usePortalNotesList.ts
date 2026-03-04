import { useCallback } from 'react';
import { portalV2ApiClient } from '../api/portalApiClient';
import type { PortalSortOrder } from '../types/contracts';
import usePortalPagedList from './usePortalPagedList';

interface UsePortalNotesListOptions {
  search: string;
  sort: 'created_at' | 'subject' | 'note_type';
  order: PortalSortOrder;
  pageSize?: number;
}

export function usePortalNotesList({ search, sort, order, pageSize }: UsePortalNotesListOptions) {
  const fetchPage = useCallback((query: Parameters<typeof portalV2ApiClient.listNotes>[0]) => {
    return portalV2ApiClient.listNotes(query);
  }, []);

  return usePortalPagedList({
    search,
    sort,
    order,
    pageSize,
    fetchPage,
  });
}

export default usePortalNotesList;
