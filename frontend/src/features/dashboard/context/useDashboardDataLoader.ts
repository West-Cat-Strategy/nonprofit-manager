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
      updateLoading(key, true);
      updateError(key, null);
      try {
        const result = await request();
        if (cancelled) return;
        onSuccess(result);
      } catch (error) {
        updateError(key, toErrorMessage(error, fallbackMessage));
      } finally {
        updateLoading(key, false);
      }
    };

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
