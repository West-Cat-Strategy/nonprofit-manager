import { useCallback } from 'react';
import { portalV2ApiClient } from '../api/portalApiClient';
import type { PortalSortOrder } from '../types/contracts';
import usePortalPagedList from './usePortalPagedList';

interface UsePortalFormsListOptions {
  search: string;
  sort: 'created_at' | 'title' | 'document_type' | 'original_name';
  order: PortalSortOrder;
  pageSize?: number;
}

export function usePortalFormsList({ search, sort, order, pageSize }: UsePortalFormsListOptions) {
  const fetchPage = useCallback((query: Parameters<typeof portalV2ApiClient.listForms>[0]) => {
    return portalV2ApiClient.listForms(query);
  }, []);

  return usePortalPagedList({
    search,
    sort,
    order,
    pageSize,
    fetchPage,
  });
}

export default usePortalFormsList;
