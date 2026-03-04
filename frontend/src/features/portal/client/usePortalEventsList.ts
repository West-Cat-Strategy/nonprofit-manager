import { useCallback } from 'react';
import { portalV2ApiClient } from '../api/portalApiClient';
import type { PortalSortOrder } from '../types/contracts';
import usePortalPagedList from './usePortalPagedList';

interface UsePortalEventsListOptions {
  search: string;
  sort: 'start_date' | 'name' | 'created_at';
  order: PortalSortOrder;
  pageSize?: number;
}

export function usePortalEventsList({ search, sort, order, pageSize }: UsePortalEventsListOptions) {
  const fetchPage = useCallback((query: Parameters<typeof portalV2ApiClient.listEvents>[0]) => {
    return portalV2ApiClient.listEvents(query);
  }, []);

  return usePortalPagedList({
    search,
    sort,
    order,
    pageSize,
    fetchPage,
  });
}

export default usePortalEventsList;
