import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PortalPagedResult, PortalSortOrder } from '../types/contracts';

interface PortalPagedListQuery<TSortField extends string> {
  search?: string;
  sort: TSortField;
  order: PortalSortOrder;
  limit: number;
  offset: number;
}

interface UsePortalPagedListOptions<TItem, TSortField extends string> {
  search: string;
  sort: TSortField;
  order: PortalSortOrder;
  pageSize?: number;
  enabled?: boolean;
  fetchPage: (query: PortalPagedListQuery<TSortField>) => Promise<PortalPagedResult<TItem>>;
}

interface UsePortalPagedListResult<TItem> {
  items: TItem[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 20;

export function usePortalPagedList<TItem, TSortField extends string>({
  search,
  sort,
  order,
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
  fetchPage,
}: UsePortalPagedListOptions<TItem, TSortField>): UsePortalPagedListResult<TItem> {
  const [items, setItems] = useState<TItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedSearch = useMemo(() => {
    const trimmed = search.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, [search]);

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean, quiet = false) => {
      if (!enabled) {
        setItems([]);
        setOffset(0);
        setTotal(0);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        setError(null);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else if (!quiet) {
        setLoading(true);
      }

      try {
        const page = await fetchPage({
          search: normalizedSearch,
          sort,
          order,
          limit: pageSize,
          offset: nextOffset,
        });

        setItems((current) => (append ? [...current, ...page.items] : page.items));
        setOffset(nextOffset + page.items.length);
        setTotal(page.page.total);
        setHasMore(page.page.has_more);
        setError(null);
      } catch (loadError) {
        if (!quiet) {
          setError('Unable to load this list right now.');
          console.error('Failed to load portal paged list', loadError);
        }
      } finally {
        if (append) {
          setLoadingMore(false);
        } else if (!quiet) {
          setLoading(false);
        }
      }
    },
    [enabled, fetchPage, normalizedSearch, order, pageSize, sort]
  );

  const refresh = useCallback(async () => {
    await loadPage(0, false);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    await loadPage(offset, true);
  }, [hasMore, loadPage, loadingMore, offset]);

  useEffect(() => {
    setOffset(0);
    void loadPage(0, false);
  }, [loadPage]);

  return {
    items,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
  };
}

export default usePortalPagedList;
