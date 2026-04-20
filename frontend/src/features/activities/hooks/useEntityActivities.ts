/**
 * Hook for fetching activities for a specific entity
 */

import { useState, useEffect, useCallback } from 'react';
import { activitiesApiClient } from '../api';
import type { ActivityRecord, EntityActivityFilters } from '../types';

export const useEntityActivities = (filters: EntityActivityFilters) => {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await activitiesApiClient.getEntityActivities(filters);
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
  }, [filters.entityType, filters.entityId]);

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
