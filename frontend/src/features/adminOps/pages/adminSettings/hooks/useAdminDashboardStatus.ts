import { useCallback, useEffect, useState } from 'react';
import { useApiError } from '../../../../../hooks/useApiError';
import {
  getAdminStats,
  getAdminWorkspaceStatusCards,
  type AdminStats,
} from '../../../api/adminHubApiClient';
import type { AdminWorkspaceStatusCard } from '../../../contracts';

export const useAdminDashboardStatus = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cards, setCards] = useState<AdminWorkspaceStatusCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { setFromError } = useApiError({ notify: true });

  const loadDashboardStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [nextStats, nextCards] = await Promise.all([
        getAdminStats(),
        getAdminWorkspaceStatusCards(),
      ]);
      setStats(nextStats);
      setCards(nextCards);
    } catch (error) {
      setFromError(error, 'Failed to load admin workspace status');
    } finally {
      setLoading(false);
    }
  }, [setFromError]);

  useEffect(() => {
    void loadDashboardStatus();
  }, [loadDashboardStatus]);

  return {
    stats,
    cards,
    loading,
    reload: loadDashboardStatus,
  };
};

export type UseAdminDashboardStatusReturn = ReturnType<typeof useAdminDashboardStatus>;
