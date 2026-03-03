import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../services/api';
import usePortalRealtimeStream from '../client/usePortalRealtimeStream';
import type { PortalStreamStatus } from '../client/types';
import type {
  PortalAppointmentSlot,
  PortalConversationDetail,
  PortalConversationThread,
} from '../../../pages/admin/adminSettings/types';

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 30_000;

const toIsoDateTime = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export interface PortalConversationFilters {
  status: 'all' | 'open' | 'closed' | 'archived';
  caseId: string;
  pointpersonUserId: string;
  search: string;
}

export interface PortalSlotFilters {
  status: 'all' | 'open' | 'closed' | 'cancelled';
  caseId: string;
  pointpersonUserId: string;
  from: string;
  to: string;
}

interface UsePortalAdminRealtimeOptions {
  active: boolean;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  notifyError: (error: unknown, fallback: string) => void;
}

interface FetchOptions {
  append?: boolean;
  quiet?: boolean;
  offsetValue?: number;
}

export interface UsePortalAdminRealtimeResult {
  streamStatus: PortalStreamStatus;
  conversationFilters: PortalConversationFilters;
  onConversationFilterChange: (field: keyof PortalConversationFilters, value: string) => void;
  portalConversationsLoading: boolean;
  portalConversationsLoadingMore: boolean;
  portalConversationsHasMore: boolean;
  portalConversations: PortalConversationThread[];
  selectedPortalConversation: PortalConversationDetail | null;
  portalConversationReply: string;
  setPortalConversationReply: (value: string) => void;
  portalConversationReplyInternal: boolean;
  setPortalConversationReplyInternal: (value: boolean) => void;
  portalConversationReplyLoading: boolean;
  fetchPortalConversations: (options?: FetchOptions) => Promise<void>;
  loadMorePortalConversations: () => Promise<void>;
  openPortalConversation: (threadId: string) => Promise<void>;
  sendPortalConversationReply: () => Promise<void>;
  updatePortalConversationStatus: (
    threadId: string,
    status: 'open' | 'closed' | 'archived'
  ) => Promise<void>;

  slotFilters: PortalSlotFilters;
  onSlotFilterChange: (field: keyof PortalSlotFilters, value: string) => void;
  portalSlotsLoading: boolean;
  portalSlotsLoadingMore: boolean;
  portalSlotsHasMore: boolean;
  portalSlots: PortalAppointmentSlot[];
  portalSlotSaving: boolean;
  portalSlotForm: {
    pointperson_user_id: string;
    case_id: string;
    title: string;
    details: string;
    location: string;
    start_time: string;
    end_time: string;
    capacity: number;
  };
  onPortalSlotFormChange: (field: string, value: string | number) => void;
  fetchPortalSlots: (options?: FetchOptions) => Promise<void>;
  loadMorePortalSlots: () => Promise<void>;
  createPortalSlot: () => Promise<void>;
  updatePortalSlotStatus: (slotId: string, status: 'open' | 'closed' | 'cancelled') => Promise<void>;
  deletePortalSlot: (slotId: string) => Promise<void>;
}

export function usePortalAdminRealtime({
  active,
  showSuccess,
  showError,
  notifyError,
}: UsePortalAdminRealtimeOptions): UsePortalAdminRealtimeResult {
  const [conversationFilters, setConversationFilters] = useState<PortalConversationFilters>({
    status: 'all',
    caseId: '',
    pointpersonUserId: '',
    search: '',
  });
  const [portalConversationsLoading, setPortalConversationsLoading] = useState(false);
  const [portalConversationsLoadingMore, setPortalConversationsLoadingMore] = useState(false);
  const [portalConversationsHasMore, setPortalConversationsHasMore] = useState(false);
  const [portalConversationsOffset, setPortalConversationsOffset] = useState(0);
  const [portalConversations, setPortalConversations] = useState<PortalConversationThread[]>([]);
  const [selectedPortalConversation, setSelectedPortalConversation] =
    useState<PortalConversationDetail | null>(null);
  const [portalConversationReply, setPortalConversationReply] = useState('');
  const [portalConversationReplyInternal, setPortalConversationReplyInternal] = useState(false);
  const [portalConversationReplyLoading, setPortalConversationReplyLoading] = useState(false);

  const [slotFilters, setSlotFilters] = useState<PortalSlotFilters>({
    status: 'all',
    caseId: '',
    pointpersonUserId: '',
    from: '',
    to: '',
  });
  const [portalSlotsLoading, setPortalSlotsLoading] = useState(false);
  const [portalSlotsLoadingMore, setPortalSlotsLoadingMore] = useState(false);
  const [portalSlotsHasMore, setPortalSlotsHasMore] = useState(false);
  const [portalSlotsOffset, setPortalSlotsOffset] = useState(0);
  const [portalSlots, setPortalSlots] = useState<PortalAppointmentSlot[]>([]);
  const [portalSlotSaving, setPortalSlotSaving] = useState(false);
  const [portalSlotForm, setPortalSlotForm] = useState({
    pointperson_user_id: '',
    case_id: '',
    title: '',
    details: '',
    location: '',
    start_time: '',
    end_time: '',
    capacity: 1,
  });

  const conversationQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      limit: PAGE_SIZE,
    };

    if (conversationFilters.status !== 'all') {
      params.status = conversationFilters.status;
    }

    if (conversationFilters.caseId.trim()) {
      params.case_id = conversationFilters.caseId.trim();
    }

    if (conversationFilters.pointpersonUserId.trim()) {
      params.pointperson_user_id = conversationFilters.pointpersonUserId.trim();
    }

    if (conversationFilters.search.trim()) {
      params.search = conversationFilters.search.trim();
    }

    return params;
  }, [conversationFilters]);

  const slotQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      limit: PAGE_SIZE,
    };

    if (slotFilters.status !== 'all') {
      params.status = slotFilters.status;
    }

    if (slotFilters.caseId.trim()) {
      params.case_id = slotFilters.caseId.trim();
    }

    if (slotFilters.pointpersonUserId.trim()) {
      params.pointperson_user_id = slotFilters.pointpersonUserId.trim();
    }

    const fromIso = toIsoDateTime(slotFilters.from);
    if (fromIso) {
      params.from = fromIso;
    }

    const toIso = toIsoDateTime(slotFilters.to);
    if (toIso) {
      params.to = toIso;
    }

    return params;
  }, [slotFilters]);

  const fetchPortalConversations = useCallback(
    async (options?: FetchOptions) => {
      if (!active) {
        return;
      }

      const append = Boolean(options?.append);
      const quiet = Boolean(options?.quiet);
      const offset = options?.offsetValue ?? 0;

      if (append) {
        setPortalConversationsLoadingMore(true);
      } else if (!quiet) {
        setPortalConversationsLoading(true);
      }

      try {
        const response = await api.get('/portal/admin/conversations', {
          params: {
            ...conversationQueryParams,
            offset,
          },
        });

        const nextRows = (response.data.conversations || []) as PortalConversationThread[];

        setPortalConversations((previous) => {
          if (!append) {
            return nextRows;
          }

          const existing = new Set(previous.map((entry) => entry.id));
          const merged = [...previous];
          for (const row of nextRows) {
            if (!existing.has(row.id)) {
              merged.push(row);
            }
          }
          return merged;
        });

        setPortalConversationsOffset(offset + nextRows.length);
        setPortalConversationsHasMore(nextRows.length === PAGE_SIZE);
      } catch (error) {
        if (!quiet) {
          notifyError(error, 'Failed to load portal conversations');
        }
      } finally {
        if (append) {
          setPortalConversationsLoadingMore(false);
        } else if (!quiet) {
          setPortalConversationsLoading(false);
        }
      }
    },
    [
      active,
      conversationQueryParams,
      notifyError,
    ]
  );

  const openPortalConversation = useCallback(
    async (threadId: string) => {
      try {
        const response = await api.get(`/portal/admin/conversations/${threadId}`);
        setSelectedPortalConversation(response.data || null);
      } catch (error) {
        notifyError(error, 'Failed to load conversation');
      }
    },
    [notifyError]
  );

  const sendPortalConversationReply = useCallback(async () => {
    if (!selectedPortalConversation || !portalConversationReply.trim()) {
      return;
    }

    try {
      setPortalConversationReplyLoading(true);
      await api.post(`/portal/admin/conversations/${selectedPortalConversation.thread.id}/messages`, {
        message: portalConversationReply.trim(),
        is_internal: portalConversationReplyInternal,
      });
      setPortalConversationReply('');
      setPortalConversationReplyInternal(false);
      showSuccess('Reply sent');
      await Promise.all([
        fetchPortalConversations({ offsetValue: 0 }),
        openPortalConversation(selectedPortalConversation.thread.id),
      ]);
    } catch (error) {
      notifyError(error, 'Failed to send reply');
    } finally {
      setPortalConversationReplyLoading(false);
    }
  }, [
    fetchPortalConversations,
    notifyError,
    openPortalConversation,
    portalConversationReply,
    portalConversationReplyInternal,
    selectedPortalConversation,
    showSuccess,
  ]);

  const updatePortalConversationStatus = useCallback(
    async (threadId: string, status: 'open' | 'closed' | 'archived') => {
      try {
        await api.patch(`/portal/admin/conversations/${threadId}`, { status });
        showSuccess(`Conversation ${status === 'open' ? 'reopened' : 'updated'}`);
        await Promise.all([
          fetchPortalConversations({ offsetValue: 0 }),
          openPortalConversation(threadId),
        ]);
      } catch (error) {
        notifyError(error, 'Failed to update conversation');
      }
    },
    [fetchPortalConversations, notifyError, openPortalConversation, showSuccess]
  );

  const fetchPortalSlots = useCallback(
    async (options?: FetchOptions) => {
      if (!active) {
        return;
      }

      const append = Boolean(options?.append);
      const quiet = Boolean(options?.quiet);
      const offset = options?.offsetValue ?? 0;

      if (append) {
        setPortalSlotsLoadingMore(true);
      } else if (!quiet) {
        setPortalSlotsLoading(true);
      }

      try {
        const response = await api.get('/portal/admin/appointment-slots', {
          params: {
            ...slotQueryParams,
            offset,
          },
        });

        const nextRows = (response.data.slots || []) as PortalAppointmentSlot[];

        setPortalSlots((previous) => {
          if (!append) {
            return nextRows;
          }

          const existing = new Set(previous.map((entry) => entry.id));
          const merged = [...previous];
          for (const row of nextRows) {
            if (!existing.has(row.id)) {
              merged.push(row);
            }
          }
          return merged;
        });

        setPortalSlotsOffset(offset + nextRows.length);
        setPortalSlotsHasMore(nextRows.length === PAGE_SIZE);
      } catch (error) {
        if (!quiet) {
          notifyError(error, 'Failed to load appointment slots');
        }
      } finally {
        if (append) {
          setPortalSlotsLoadingMore(false);
        } else if (!quiet) {
          setPortalSlotsLoading(false);
        }
      }
    },
    [active, notifyError, slotQueryParams]
  );

  const createPortalSlot = useCallback(async () => {
    if (!portalSlotForm.pointperson_user_id || !portalSlotForm.start_time || !portalSlotForm.end_time) {
      showError('Pointperson, start time, and end time are required for a slot');
      return;
    }

    const startIso = toIsoDateTime(portalSlotForm.start_time);
    const endIso = toIsoDateTime(portalSlotForm.end_time);

    if (!startIso || !endIso) {
      showError('Invalid slot date/time values');
      return;
    }

    try {
      setPortalSlotSaving(true);
      await api.post('/portal/admin/appointment-slots', {
        pointperson_user_id: portalSlotForm.pointperson_user_id,
        case_id: portalSlotForm.case_id || null,
        title: portalSlotForm.title || null,
        details: portalSlotForm.details || null,
        location: portalSlotForm.location || null,
        start_time: startIso,
        end_time: endIso,
        capacity: portalSlotForm.capacity,
      });
      showSuccess('Appointment slot created');
      setPortalSlotForm((prev) => ({
        ...prev,
        case_id: '',
        title: '',
        details: '',
        location: '',
        start_time: '',
        end_time: '',
        capacity: 1,
      }));
      await fetchPortalSlots({ offsetValue: 0 });
    } catch (error) {
      notifyError(error, 'Failed to create appointment slot');
    } finally {
      setPortalSlotSaving(false);
    }
  }, [fetchPortalSlots, notifyError, portalSlotForm, showError, showSuccess]);

  const updatePortalSlotStatus = useCallback(
    async (slotId: string, status: 'open' | 'closed' | 'cancelled') => {
      try {
        await api.patch(`/portal/admin/appointment-slots/${slotId}`, { status });
        showSuccess('Appointment slot updated');
        await fetchPortalSlots({ offsetValue: 0 });
      } catch (error) {
        notifyError(error, 'Failed to update slot');
      }
    },
    [fetchPortalSlots, notifyError, showSuccess]
  );

  const deletePortalSlot = useCallback(
    async (slotId: string) => {
      try {
        await api.delete(`/portal/admin/appointment-slots/${slotId}`);
        showSuccess('Appointment slot deleted');
        await fetchPortalSlots({ offsetValue: 0 });
      } catch (error) {
        notifyError(error, 'Failed to delete slot');
      }
    },
    [fetchPortalSlots, notifyError, showSuccess]
  );

  const streamStatus = usePortalRealtimeStream({
    endpointPath: '/portal/admin/stream',
    channels: ['conversations', 'appointments', 'slots'],
    enabled: active,
    onEvent: (eventName, payload) => {
      if (!active) {
        return;
      }

      void fetchPortalConversations({ quiet: true, offsetValue: 0 });
      void fetchPortalSlots({ quiet: true, offsetValue: 0 });

      if (
        selectedPortalConversation &&
        (payload.entity_id === selectedPortalConversation.thread.id ||
          eventName === 'portal.thread.updated')
      ) {
        void openPortalConversation(selectedPortalConversation.thread.id);
      }
    },
  });

  useEffect(() => {
    if (!active) {
      return;
    }

    void fetchPortalConversations({ offsetValue: 0 });
  }, [
    active,
    fetchPortalConversations,
    conversationFilters.caseId,
    conversationFilters.pointpersonUserId,
    conversationFilters.search,
    conversationFilters.status,
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }

    void fetchPortalSlots({ offsetValue: 0 });
  }, [
    active,
    fetchPortalSlots,
    slotFilters.caseId,
    slotFilters.from,
    slotFilters.pointpersonUserId,
    slotFilters.status,
    slotFilters.to,
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (streamStatus === 'connected' || streamStatus === 'connecting') {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchPortalConversations({ quiet: true, offsetValue: 0 });
      void fetchPortalSlots({ quiet: true, offsetValue: 0 });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [active, fetchPortalConversations, fetchPortalSlots, streamStatus]);

  return {
    streamStatus,
    conversationFilters,
    onConversationFilterChange: (field, value) => {
      setConversationFilters((prev) => ({
        ...prev,
        [field]: value,
      }));
      setPortalConversationsOffset(0);
    },
    portalConversationsLoading,
    portalConversationsLoadingMore,
    portalConversationsHasMore,
    portalConversations,
    selectedPortalConversation,
    portalConversationReply,
    setPortalConversationReply,
    portalConversationReplyInternal,
    setPortalConversationReplyInternal,
    portalConversationReplyLoading,
    fetchPortalConversations,
    loadMorePortalConversations: async () => {
      if (!portalConversationsHasMore || portalConversationsLoadingMore) {
        return;
      }
      await fetchPortalConversations({ append: true, offsetValue: portalConversationsOffset });
    },
    openPortalConversation,
    sendPortalConversationReply,
    updatePortalConversationStatus,

    slotFilters,
    onSlotFilterChange: (field, value) => {
      setSlotFilters((prev) => ({
        ...prev,
        [field]: value,
      }));
      setPortalSlotsOffset(0);
    },
    portalSlotsLoading,
    portalSlotsLoadingMore,
    portalSlotsHasMore,
    portalSlots,
    portalSlotSaving,
    portalSlotForm,
    onPortalSlotFormChange: (field, value) => {
      setPortalSlotForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    fetchPortalSlots,
    loadMorePortalSlots: async () => {
      if (!portalSlotsHasMore || portalSlotsLoadingMore) {
        return;
      }
      await fetchPortalSlots({ append: true, offsetValue: portalSlotsOffset });
    },
    createPortalSlot,
    updatePortalSlotStatus,
    deletePortalSlot,
  };
}

export default usePortalAdminRealtime;
