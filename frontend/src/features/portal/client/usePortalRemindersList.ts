import { useCallback } from 'react';
import { portalV2ApiClient } from '../api/portalApiClient';
import type { PortalSortOrder } from '../types/contracts';
import usePortalPagedList from './usePortalPagedList';

interface UsePortalRemindersListOptions {
  search: string;
  sort: 'date' | 'title' | 'type';
  order: PortalSortOrder;
  pageSize?: number;
}

export function usePortalRemindersList({
  search,
  sort,
  order,
  pageSize,
}: UsePortalRemindersListOptions) {
  const fetchPage = useCallback((query: Parameters<typeof portalV2ApiClient.listReminders>[0]) => {
    return portalV2ApiClient.listReminders(query);
  }, []);

  return usePortalPagedList({
    search,
    sort,
    order,
    pageSize,
    fetchPage,
  });
}

export default usePortalRemindersList;
