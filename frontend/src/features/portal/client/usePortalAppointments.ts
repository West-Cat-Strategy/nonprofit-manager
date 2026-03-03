import { useCallback, useEffect, useMemo, useState } from 'react';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import usePortalRealtimeStream from './usePortalRealtimeStream';
import type {
  PortalRealtimeEventName,
  PortalRealtimeEventPayload,
  PortalStreamStatus,
} from './types';

export interface PortalAppointmentListItem {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  status: string;
  location?: string | null;
  case_number?: string | null;
  case_title?: string | null;
  request_type?: 'manual_request' | 'slot_booking';
}

interface UsePortalAppointmentsOptions {
  statusFilter: 'all' | 'requested' | 'confirmed' | 'cancelled' | 'completed';
  search: string;
  selectedCaseId: string;
  caseFilter: 'all' | 'selected';
  from?: string;
  to?: string;
  onRealtimeEvent?: (eventName: PortalRealtimeEventName, payload: PortalRealtimeEventPayload) => void;
}

interface UsePortalAppointmentsResult {
  appointments: PortalAppointmentListItem[];
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

export function usePortalAppointments({
  statusFilter,
  search,
  selectedCaseId,
  caseFilter,
  from,
  to,
  onRealtimeEvent,
}: UsePortalAppointmentsOptions): UsePortalAppointmentsResult {
  const [appointments, setAppointments] = useState<PortalAppointmentListItem[]>([]);
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

    if (from) {
      params.from = from;
    }
    if (to) {
      params.to = to;
    }

    return params;
  }, [caseFilter, from, search, selectedCaseId, statusFilter, to]);

  const fetchAppointments = useCallback(
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
        const response = await portalApi.get<PortalAppointmentListItem[]>('/v2/portal/appointments', {
          params: {
            ...requestParams,
            offset: nextOffset,
          },
        });
        const nextAppointments = unwrapApiData(response.data) || [];

        setAppointments((current) => {
          if (!append) {
            return nextAppointments;
          }

          const existingIds = new Set(current.map((entry) => entry.id));
          const merged = [...current];
          for (const row of nextAppointments) {
            if (!existingIds.has(row.id)) {
              merged.push(row);
            }
          }
          return merged;
        });

        setOffset(nextOffset + nextAppointments.length);
        setHasMore(nextAppointments.length === PAGE_SIZE);
        setError(null);
      } catch (loadError) {
        if (!quiet) {
          console.error('Failed to load portal appointments', loadError);
          setError('Unable to load appointments right now.');
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
    await fetchAppointments({ append: false, offsetValue: 0 });
  }, [fetchAppointments]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) {
      return;
    }
    await fetchAppointments({ append: true, offsetValue: offset });
  }, [fetchAppointments, hasMore, loadingMore, offset]);

  const streamStatus = usePortalRealtimeStream({
    endpointPath: '/v2/portal/stream',
    channels: ['appointments'],
    onEvent: (eventName, payload) => {
      onRealtimeEvent?.(eventName, payload);
      void fetchAppointments({ append: false, quiet: true, offsetValue: 0 });
    },
  });

  useEffect(() => {
    setOffset(0);
    void fetchAppointments({ append: false, offsetValue: 0 });
  }, [fetchAppointments, requestParams]);

  useEffect(() => {
    if (streamStatus === 'connected' || streamStatus === 'connecting') {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchAppointments({ append: false, quiet: true, offsetValue: 0 });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchAppointments, streamStatus]);

  return {
    appointments,
    loading,
    loadingMore,
    hasMore,
    error,
    streamStatus,
    refresh,
    loadMore,
  };
}

export default usePortalAppointments;
