import { useCallback, useEffect, useMemo, useState } from 'react';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import usePortalRealtimeStream from './usePortalRealtimeStream';
import type {
  PortalRealtimeEventName,
  PortalRealtimeEventPayload,
  PortalStreamStatus,
} from './types';

export interface PortalThreadSummary {
  id: string;
  subject: string | null;
  status: 'open' | 'closed' | 'archived';
  case_number: string | null;
  case_title: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  unread_count: number;
  last_message_at: string;
  last_message_preview: string | null;
}

interface ThreadsResponsePayload {
  threads: PortalThreadSummary[];
}

interface UsePortalMessageThreadsOptions {
  statusFilter: 'all' | 'open' | 'closed' | 'archived';
  search: string;
  selectedCaseId: string;
  caseFilter: 'all' | 'selected';
  onRealtimeEvent?: (eventName: PortalRealtimeEventName, payload: PortalRealtimeEventPayload) => void;
}

interface UsePortalMessageThreadsResult {
  threads: PortalThreadSummary[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  streamStatus: PortalStreamStatus;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 30_000;

export function usePortalMessageThreads({
  statusFilter,
  search,
  selectedCaseId,
  caseFilter,
  onRealtimeEvent,
}: UsePortalMessageThreadsOptions): UsePortalMessageThreadsResult {
  const [threads, setThreads] = useState<PortalThreadSummary[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestParams = useMemo(() => {
    const params: Record<string, string | number> = {
      limit: PAGE_SIZE,
    };

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      params.search = trimmedSearch;
    }

    if (caseFilter === 'selected' && selectedCaseId) {
      params.case_id = selectedCaseId;
    }

    return params;
  }, [caseFilter, search, selectedCaseId, statusFilter]);

  const fetchThreads = useCallback(
    async (input?: { append?: boolean; quiet?: boolean; offsetValue?: number }) => {
      const append = Boolean(input?.append);
      const quiet = Boolean(input?.quiet);
      const nextOffset = input?.offsetValue ?? 0;

      if (append) {
        setLoadingMore(true);
      } else if (!quiet) {
        setLoading(true);
      }

      try {
        const response = await portalApi.get<ThreadsResponsePayload>('/v2/portal/messages/threads', {
          params: {
            ...requestParams,
            offset: nextOffset,
          },
        });
        const payload = unwrapApiData(response.data);
        const nextThreads = payload.threads || [];

        setThreads((current) => {
          if (!append) {
            return nextThreads;
          }

          const existingIds = new Set(current.map((entry) => entry.id));
          const merged = [...current];
          for (const row of nextThreads) {
            if (!existingIds.has(row.id)) {
              merged.push(row);
            }
          }
          return merged;
        });
        setOffset(nextOffset + nextThreads.length);
        setHasMore(nextThreads.length === PAGE_SIZE);
        setError(null);
      } catch (loadError) {
        if (!quiet) {
          console.error('Failed to load portal message threads', loadError);
          setError('Unable to load conversations right now.');
        }
      } finally {
        if (append) {
          setLoadingMore(false);
        } else if (!quiet) {
          setLoading(false);
        }
      }
    },
    [requestParams]
  );

  const refresh = useCallback(async () => {
    await fetchThreads({ append: false, offsetValue: 0 });
  }, [fetchThreads]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) {
      return;
    }
    await fetchThreads({ append: true, offsetValue: offset });
  }, [fetchThreads, hasMore, loadingMore, offset]);

  const streamStatus = usePortalRealtimeStream({
    endpointPath: '/v2/portal/stream',
    channels: ['messages'],
    onEvent: (eventName, payload) => {
      onRealtimeEvent?.(eventName, payload);
      void fetchThreads({ append: false, quiet: true, offsetValue: 0 });
    },
  });

  useEffect(() => {
    setOffset(0);
    void fetchThreads({ append: false, offsetValue: 0 });
  }, [fetchThreads, requestParams]);

  useEffect(() => {
    if (streamStatus === 'connected' || streamStatus === 'connecting') {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchThreads({ append: false, quiet: true, offsetValue: 0 });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchThreads, streamStatus]);

  return {
    threads,
    loading,
    loadingMore,
    hasMore,
    error,
    streamStatus,
    refresh,
    loadMore,
  };
}

export default usePortalMessageThreads;
