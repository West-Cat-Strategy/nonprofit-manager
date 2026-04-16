import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { analyticsApiClient } from '../../analytics/api/analyticsApiClient';
import { casesApiClient } from '../../cases/api/casesApiClient';
import { followUpsApiClient } from '../../followUps/api/followUpsApiClient';
import { tasksApiClient } from '../../tasks/api/tasksApiClient';
import { useAppSelector } from '../../../store/hooks';
import type { AnalyticsSummary } from '../../analytics/types/contracts';
import type { CaseWithDetails } from '../../../types/case';
import type { CaseSummary } from '../../../types/case';
import type { FollowUpSummary, FollowUpWithEntity } from '../../followUps/types/contracts';
import type { TaskSummary } from '../../tasks/types/contracts';

type DashboardDataKey =
  | 'analytics'
  | 'caseSummary'
  | 'taskSummary'
  | 'followUpSummary'
  | 'upcomingFollowUps'
  | 'assignedCases';

export interface DashboardDataContextValue {
  analyticsSummary: AnalyticsSummary | null;
  caseSummary: CaseSummary | null;
  taskSummary: TaskSummary | null;
  followUpSummary: FollowUpSummary | null;
  upcomingFollowUps: FollowUpWithEntity[];
  assignedCases: CaseWithDetails[];
  assignedCasesTotal: number;
  loading: Record<DashboardDataKey, boolean>;
  errors: Partial<Record<DashboardDataKey, string>>;
  hasStartedLoading: boolean;
}

const initialLoadingState: Record<DashboardDataKey, boolean> = {
  analytics: false,
  caseSummary: false,
  taskSummary: false,
  followUpSummary: false,
  upcomingFollowUps: false,
  assignedCases: false,
};

export const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

const initialContextValue: DashboardDataContextValue = {
  analyticsSummary: null,
  caseSummary: null,
  taskSummary: null,
  followUpSummary: null,
  upcomingFollowUps: [],
  assignedCases: [],
  assignedCasesTotal: 0,
  loading: initialLoadingState,
  errors: {},
  hasStartedLoading: false,
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const userId = user?.id ?? null;
  const [state, setState] = useState<DashboardDataContextValue>(initialContextValue);

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
      setState(initialContextValue);
      return undefined;
    }

    const updateLoading = (key: DashboardDataKey, loading: boolean) => {
      if (cancelled) return;
      setState((current) => ({
        ...current,
        hasStartedLoading: true,
        loading: {
          ...current.loading,
          [key]: loading,
        },
      }));
    };

    const updateError = (key: DashboardDataKey, error: string | null) => {
      if (cancelled) return;
      setState((current) => {
        const nextErrors = { ...current.errors };
        if (error) {
          nextErrors[key] = error;
        } else {
          delete nextErrors[key];
        }
        return {
          ...current,
          errors: nextErrors,
        };
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
      void runRequest(
        'analytics',
        () => analyticsApiClient.fetchSummary(),
        (result) => {
          setState((current) => ({ ...current, analyticsSummary: result }));
        },
        'Unable to load dashboard insights'
      );

      void runRequest(
        'caseSummary',
        () => casesApiClient.getCaseSummary(),
        (result) => {
          setState((current) => ({ ...current, caseSummary: result }));
        },
        'Unable to load case summary'
      );

      void runRequest(
        'taskSummary',
        () => tasksApiClient.getTaskSummary(),
        (result) => {
          setState((current) => ({ ...current, taskSummary: result }));
        },
        'Unable to load task summary'
      );

      void runRequest(
        'followUpSummary',
        () => followUpsApiClient.fetchFollowUpSummary(),
        (result) => {
          setState((current) => ({ ...current, followUpSummary: result }));
        },
        'Unable to load follow-up summary'
      );

      void runRequest(
        'upcomingFollowUps',
        () => followUpsApiClient.fetchUpcomingFollowUps(5),
        (result) => {
          setState((current) => ({ ...current, upcomingFollowUps: result }));
        },
        'Unable to load upcoming follow-ups'
      );

      if (!userId) {
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
          setState((current) => ({
            ...current,
            assignedCases: Array.isArray(result.cases) ? result.cases : [],
            assignedCasesTotal: typeof result.total === 'number' ? result.total : 0,
          }));
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
  }, [isAuthenticated, userId]);

  const value = useMemo(() => state, [state]);

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  return useContext(DashboardDataContext);
}
