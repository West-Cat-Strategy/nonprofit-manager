import { useEffect, useMemo, useState } from 'react';
import { analyticsApiClient } from '../../analytics/api/analyticsApiClient';
import { casesApiClient } from '../../cases/api/casesApiClient';
import { followUpsApiClient } from '../../followUps/api/followUpsApiClient';
import { tasksApiClient } from '../../tasks/api/tasksApiClient';
import type { AnalyticsSummary, DonationTrendPoint } from '../../analytics/types/contracts';
import type { CaseSummary, CaseWithDetails } from '../../../types/case';
import type { FollowUpSummary, FollowUpWithEntity } from '../../followUps/types/contracts';
import type { TaskSummary } from '../../tasks/types/contracts';
import type { DashboardDataContextValue, DashboardDataKey } from './DashboardDataContext';

interface DashboardDataLoaderOptions {
  lanes: readonly DashboardDataKey[];
  isAuthenticated: boolean;
  userId: string | null;
}

const initialLoadingState: Record<DashboardDataKey, boolean> = {
  analytics: false,
  donationTrends: false,
  caseSummary: false,
  taskSummary: false,
  followUpSummary: false,
  upcomingFollowUps: false,
  assignedCases: false,
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

const DASHBOARD_STARTUP_DEDUPE_WINDOW_MS = 1500;

const inflightDashboardLaneRequests = new Map<string, Promise<unknown>>();
const recentDashboardLaneResults = new Map<
  string,
  {
    expiresAt: number;
    value: unknown;
  }
>();
const scheduledDashboardLaneCleanup = new Map<string, ReturnType<typeof setTimeout>>();

const getLaneCacheKey = (key: DashboardDataKey, userId: string | null) => `${key}:${userId ?? 'anonymous'}`;

const getRecentLaneResult = <T,>(cacheKey: string): T | undefined => {
  const cached = recentDashboardLaneResults.get(cacheKey);
  if (!cached) {
    return undefined;
  }
  if (cached.expiresAt < Date.now()) {
    recentDashboardLaneResults.delete(cacheKey);
    return undefined;
  }
  return cached.value as T;
};

const cancelScheduledLaneCleanup = (cacheKey: string): void => {
  const cleanupHandle = scheduledDashboardLaneCleanup.get(cacheKey);
  if (!cleanupHandle) {
    return;
  }
  clearTimeout(cleanupHandle);
  scheduledDashboardLaneCleanup.delete(cacheKey);
};

const scheduleLaneCleanup = (cacheKey: string): void => {
  cancelScheduledLaneCleanup(cacheKey);
  const cached = recentDashboardLaneResults.get(cacheKey);
  if (!cached) {
    return;
  }

  const cleanupDelayMs = Math.max(cached.expiresAt - Date.now(), 0);
  const cleanupHandle = setTimeout(() => {
    const latestCached = recentDashboardLaneResults.get(cacheKey);
    if (!latestCached || latestCached.expiresAt <= Date.now()) {
      recentDashboardLaneResults.delete(cacheKey);
    }
    scheduledDashboardLaneCleanup.delete(cacheKey);
  }, cleanupDelayMs);
  scheduledDashboardLaneCleanup.set(cacheKey, cleanupHandle);
};

export const resetDashboardDataLoaderCacheForTests = (): void => {
  inflightDashboardLaneRequests.clear();
  recentDashboardLaneResults.clear();
  for (const cleanupHandle of scheduledDashboardLaneCleanup.values()) {
    clearTimeout(cleanupHandle);
  }
  scheduledDashboardLaneCleanup.clear();
};

export function useDashboardDataLoader({
  lanes,
  isAuthenticated,
  userId,
}: DashboardDataLoaderOptions): DashboardDataContextValue {
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [donationTrends, setDonationTrends] = useState<DonationTrendPoint[]>([]);
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null);
  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null);
  const [followUpSummary, setFollowUpSummary] = useState<FollowUpSummary | null>(null);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUpWithEntity[]>([]);
  const [assignedCases, setAssignedCases] = useState<CaseWithDetails[]>([]);
  const [assignedCasesTotal, setAssignedCasesTotal] = useState(0);
  const [loading, setLoading] = useState<Record<DashboardDataKey, boolean>>(initialLoadingState);
  const [errors, setErrors] = useState<Partial<Record<DashboardDataKey, string>>>({});
  const [hasStartedLoading, setHasStartedLoading] = useState(false);

  const enabledLanes = useMemo(() => new Set<DashboardDataKey>(lanes), [lanes]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    let idleHandle: number | null = null;
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: {
          timeout?: number;
        }
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (!isAuthenticated) {
      setAnalyticsSummary(null);
      setDonationTrends([]);
      setCaseSummary(null);
      setTaskSummary(null);
      setFollowUpSummary(null);
      setUpcomingFollowUps([]);
      setAssignedCases([]);
      setAssignedCasesTotal(0);
      setLoading(initialLoadingState);
      setErrors({});
      setHasStartedLoading(false);
      return undefined;
    }

    const updateLoading = (key: DashboardDataKey, isLoading: boolean) => {
      if (cancelled) return;
      if (isLoading) {
        setHasStartedLoading(true);
      }
      setLoading((current) => ({
        ...current,
        [key]: isLoading,
      }));
    };

    const updateError = (key: DashboardDataKey, error: string | null) => {
      if (cancelled) return;
      setErrors((current) => {
        const nextErrors = { ...current };
        if (error) {
          nextErrors[key] = error;
        } else {
          delete nextErrors[key];
        }
        return nextErrors;
      });
    };

    const runRequest = async <T,>(
      key: DashboardDataKey,
      request: () => Promise<T>,
      onSuccess: (result: T) => void,
      fallbackMessage: string
    ) => {
      const cacheKey = getLaneCacheKey(key, userId);
      cancelScheduledLaneCleanup(cacheKey);
      const recentResult = getRecentLaneResult<T>(cacheKey);
      if (recentResult !== undefined) {
        updateError(key, null);
        onSuccess(recentResult);
        updateLoading(key, false);
        return;
      }

      updateLoading(key, true);
      updateError(key, null);
      try {
        let requestPromise = inflightDashboardLaneRequests.get(cacheKey) as Promise<T> | undefined;
        if (!requestPromise) {
          requestPromise = request()
            .then((result) => {
              recentDashboardLaneResults.set(cacheKey, {
                expiresAt: Date.now() + DASHBOARD_STARTUP_DEDUPE_WINDOW_MS,
                value: result,
              });
              return result;
            })
            .finally(() => {
              inflightDashboardLaneRequests.delete(cacheKey);
            });
          inflightDashboardLaneRequests.set(cacheKey, requestPromise);
        }

        const result = await requestPromise;
        if (cancelled) return;
        onSuccess(result);
      } catch (error) {
        updateError(key, toErrorMessage(error, fallbackMessage));
      } finally {
        updateLoading(key, false);
      }
    };

    const activeLaneCacheKeys = Array.from(enabledLanes, (key) => getLaneCacheKey(key, userId));

    const loadDashboardData = () => {
      if (enabledLanes.has('analytics')) {
        void runRequest(
          'analytics',
          () => analyticsApiClient.fetchSummary(),
          (result) => {
            setAnalyticsSummary(result);
          },
          'Unable to load dashboard insights'
        );
      }

      if (enabledLanes.has('donationTrends')) {
        void runRequest(
          'donationTrends',
          () => analyticsApiClient.fetchDonationTrends(12),
          (result) => {
            setDonationTrends(Array.isArray(result) ? result : []);
          },
          'Unable to load donation trends'
        );
      }

      if (enabledLanes.has('caseSummary')) {
        void runRequest(
          'caseSummary',
          () => casesApiClient.getCaseSummary(),
          (result) => {
            setCaseSummary(result);
          },
          'Unable to load case summary'
        );
      }

      if (enabledLanes.has('taskSummary')) {
        void runRequest(
          'taskSummary',
          () => tasksApiClient.getTaskSummary(),
          (result) => {
            setTaskSummary(result);
          },
          'Unable to load task summary'
        );
      }

      if (enabledLanes.has('followUpSummary')) {
        void runRequest(
          'followUpSummary',
          () => followUpsApiClient.fetchFollowUpSummary(),
          (result) => {
            setFollowUpSummary(result);
          },
          'Unable to load follow-up summary'
        );
      }

      if (enabledLanes.has('upcomingFollowUps')) {
        void runRequest(
          'upcomingFollowUps',
          () => followUpsApiClient.fetchUpcomingFollowUps(5),
          (result) => {
            setUpcomingFollowUps(result);
          },
          'Unable to load upcoming follow-ups'
        );
      }

      if (!enabledLanes.has('assignedCases')) {
        return;
      }

      if (!userId) {
        setAssignedCases([]);
        setAssignedCasesTotal(0);
        updateError('assignedCases', null);
        return;
      }

      void runRequest(
        'assignedCases',
        () =>
          casesApiClient.listCases({
            assignedTo: userId,
            page: 1,
            limit: 5,
            sortBy: 'due_date',
            sortOrder: 'asc',
          }),
        (result) => {
          setAssignedCases(Array.isArray(result.cases) ? result.cases : []);
          setAssignedCasesTotal(typeof result.total === 'number' ? result.total : 0);
        },
        'Unable to load assigned cases'
      );
    };

    if (typeof window !== 'undefined' && typeof idleWindow.requestIdleCallback === 'function') {
      idleHandle = idleWindow.requestIdleCallback(loadDashboardData, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(loadDashboardData, 250);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (idleHandle !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      for (const cacheKey of activeLaneCacheKeys) {
        scheduleLaneCleanup(cacheKey);
      }
    };
  }, [enabledLanes, isAuthenticated, userId]);

  return useMemo(
    () => ({
      analyticsSummary,
      donationTrends,
      caseSummary,
      taskSummary,
      followUpSummary,
      upcomingFollowUps,
      assignedCases,
      assignedCasesTotal,
      loading,
      errors,
      hasStartedLoading,
    }),
    [
      analyticsSummary,
      assignedCases,
      assignedCasesTotal,
      caseSummary,
      donationTrends,
      errors,
      followUpSummary,
      hasStartedLoading,
      loading,
      taskSummary,
      upcomingFollowUps,
    ]
  );
}
