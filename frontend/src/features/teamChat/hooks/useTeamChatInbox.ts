import { useCallback, useEffect, useState } from 'react';
import { teamChatApiClient } from '../api/teamChatApi';
import type { TeamChatInboxItem, TeamChatUnreadSummary } from '../types';
import { useVisibilityPolling } from './useVisibilityPolling';

const EMPTY_SUMMARY: TeamChatUnreadSummary = {
  total_unread_count: 0,
  total_unread_mentions_count: 0,
  rooms_with_unread_count: 0,
};

export interface UseTeamChatInboxResult {
  rooms: TeamChatInboxItem[];
  summary: TeamChatUnreadSummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTeamChatInbox(enabled: boolean): UseTeamChatInboxResult {
  const [rooms, setRooms] = useState<TeamChatInboxItem[]>([]);
  const [summary, setSummary] = useState<TeamChatUnreadSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setRooms([]);
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const [nextRooms, nextSummary] = await Promise.all([
        teamChatApiClient.getInbox(),
        teamChatApiClient.getUnreadSummary(),
      ]);
      setRooms(nextRooms);
      setSummary(nextSummary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team chat inbox');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useVisibilityPolling(refresh, {
    enabled,
    intervalMs: 30000,
    runImmediately: false,
  });

  return {
    rooms,
    summary,
    loading,
    error,
    refresh,
  };
}
