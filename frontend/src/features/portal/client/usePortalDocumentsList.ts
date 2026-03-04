import { useCallback } from 'react';
import { portalV2ApiClient } from '../api/portalApiClient';
import type { PortalSortOrder } from '../types/contracts';
import usePortalPagedList from './usePortalPagedList';

interface UsePortalDocumentsListOptions {
  search: string;
  sort: 'created_at' | 'title' | 'document_type' | 'original_name';
  order: PortalSortOrder;
  pageSize?: number;
}

export function usePortalDocumentsList({
  search,
  sort,
  order,
  pageSize,
}: UsePortalDocumentsListOptions) {
  const fetchPage = useCallback((query: Parameters<typeof portalV2ApiClient.listDocuments>[0]) => {
    return portalV2ApiClient.listDocuments(query);
  }, []);

  return usePortalPagedList({
    search,
    sort,
    order,
    pageSize,
    fetchPage,
  });
}

export default usePortalDocumentsList;
