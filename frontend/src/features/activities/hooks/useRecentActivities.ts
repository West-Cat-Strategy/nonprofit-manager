/**
 * Hook for fetching recent activities
 */

import { useState, useEffect, useCallback } from 'react';
import { activitiesApiClient } from '../api';
import type { ActivityRecord, ActivityListFilters } from '../types';

export const useRecentActivities = (filters?: ActivityListFilters | undefined) => {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await activitiesApiClient.getRecentActivities(filters);
      setActivities(data.activities);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setTotal(0);
      setError('Failed to load activities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters?.limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    total,
    loading,
    error,
    refresh: fetchActivities,
  };
};
