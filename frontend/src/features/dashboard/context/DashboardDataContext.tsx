/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { analyticsApiClient } from '../../analytics/api/analyticsApiClient';
import { casesApiClient } from '../../cases/api/casesApiClient';
import { followUpsApiClient } from '../../followUps/api/followUpsApiClient';
import { tasksApiClient } from '../../tasks/api/tasksApiClient';
import { useAppSelector } from '../../../store/hooks';
import type { AnalyticsSummary } from '../../analytics/types/contracts';
import type { DonationTrendPoint } from '../../analytics/types/contracts';
import type { CaseWithDetails } from '../../../types/case';
import type { CaseSummary } from '../../../types/case';
import type { FollowUpSummary, FollowUpWithEntity } from '../../followUps/types/contracts';
import type { TaskSummary } from '../../tasks/types/contracts';

export type DashboardDataKey =
  | 'analytics'
  | 'donationTrends'
  | 'caseSummary'
  | 'taskSummary'
  | 'followUpSummary'
  | 'upcomingFollowUps'
  | 'assignedCases';

interface DashboardLaneState {
  loading: boolean;
  error: string | null;
}

interface DashboardAnalyticsSummaryContextValue extends DashboardLaneState {
  analyticsSummary: AnalyticsSummary | null;
}

interface DashboardDonationTrendsContextValue extends DashboardLaneState {
  donationTrends: DonationTrendPoint[];
}

interface DashboardCaseSummaryContextValue extends DashboardLaneState {
  caseSummary: CaseSummary | null;
}

interface DashboardTaskSummaryContextValue extends DashboardLaneState {
  taskSummary: TaskSummary | null;
}

interface DashboardFollowUpSummaryContextValue extends DashboardLaneState {
  followUpSummary: FollowUpSummary | null;
}

interface DashboardUpcomingFollowUpsContextValue extends DashboardLaneState {
  upcomingFollowUps: FollowUpWithEntity[];
}

interface DashboardAssignedCasesContextValue extends DashboardLaneState {
  assignedCases: CaseWithDetails[];
  assignedCasesTotal: number;
}

export const WORKBENCH_DASHBOARD_LANES = [
  'analytics',
  'caseSummary',
  'taskSummary',
  'followUpSummary',
  'upcomingFollowUps',
  'assignedCases',
] as const satisfies readonly DashboardDataKey[];

export const CUSTOM_DASHBOARD_LANES = [
  'analytics',
  'donationTrends',
  'caseSummary',
  'taskSummary',
  'followUpSummary',
  'upcomingFollowUps',
  'assignedCases',
] as const satisfies readonly DashboardDataKey[];

export interface DashboardDataContextValue {
  analyticsSummary: AnalyticsSummary | null;
  donationTrends: DonationTrendPoint[];
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
  donationTrends: false,
  caseSummary: false,
  taskSummary: false,
  followUpSummary: false,
  upcomingFollowUps: false,
  assignedCases: false,
};

export const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);
const DashboardAnalyticsSummaryContext = createContext<DashboardAnalyticsSummaryContextValue | null>(null);
const DashboardDonationTrendsContext = createContext<DashboardDonationTrendsContextValue | null>(null);
const DashboardCaseSummaryContext = createContext<DashboardCaseSummaryContextValue | null>(null);
const DashboardTaskSummaryContext = createContext<DashboardTaskSummaryContextValue | null>(null);
const DashboardFollowUpSummaryContext = createContext<DashboardFollowUpSummaryContextValue | null>(null);
const DashboardUpcomingFollowUpsContext = createContext<DashboardUpcomingFollowUpsContextValue | null>(null);
const DashboardAssignedCasesContext = createContext<DashboardAssignedCasesContextValue | null>(null);

const initialContextValue: DashboardDataContextValue = {
  analyticsSummary: null,
  donationTrends: [],
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

interface DashboardDataProviderProps {
  children: ReactNode;
  lanes: readonly DashboardDataKey[];
}

export function DashboardDataProvider({ children, lanes }: DashboardDataProviderProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const userId = user?.id ?? null;
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(
    initialContextValue.analyticsSummary
  );
  const [donationTrends, setDonationTrends] = useState<DonationTrendPoint[]>(initialContextValue.donationTrends);
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(initialContextValue.caseSummary);
  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(initialContextValue.taskSummary);
  const [followUpSummary, setFollowUpSummary] = useState<FollowUpSummary | null>(
    initialContextValue.followUpSummary
  );
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUpWithEntity[]>(
    initialContextValue.upcomingFollowUps
  );
  const [assignedCases, setAssignedCases] = useState<CaseWithDetails[]>(initialContextValue.assignedCases);
  const [assignedCasesTotal, setAssignedCasesTotal] = useState(initialContextValue.assignedCasesTotal);
  const [loading, setLoading] = useState<Record<DashboardDataKey, boolean>>(initialLoadingState);
  const [errors, setErrors] = useState<Partial<Record<DashboardDataKey, string>>>(initialContextValue.errors);
  const [hasStartedLoading, setHasStartedLoading] = useState(initialContextValue.hasStartedLoading);

  const laneSignature = lanes.join('|');
  const enabledLanes = useMemo(() => new Set<DashboardDataKey>(lanes), [laneSignature]);

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
      setAnalyticsSummary(initialContextValue.analyticsSummary);
      setDonationTrends(initialContextValue.donationTrends);
      setCaseSummary(initialContextValue.caseSummary);
      setTaskSummary(initialContextValue.taskSummary);
      setFollowUpSummary(initialContextValue.followUpSummary);
      setUpcomingFollowUps(initialContextValue.upcomingFollowUps);
      setAssignedCases(initialContextValue.assignedCases);
      setAssignedCasesTotal(initialContextValue.assignedCasesTotal);
      setLoading(initialLoadingState);
      setErrors(initialContextValue.errors);
      setHasStartedLoading(initialContextValue.hasStartedLoading);
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
        setAssignedCases(initialContextValue.assignedCases);
        setAssignedCasesTotal(initialContextValue.assignedCasesTotal);
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

  const compatibilityValue = useMemo<DashboardDataContextValue>(
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

  const analyticsSummaryValue = useMemo<DashboardAnalyticsSummaryContextValue>(
    () => ({
      analyticsSummary,
      loading: loading.analytics,
      error: errors.analytics ?? null,
    }),
    [analyticsSummary, errors.analytics, loading.analytics]
  );

  const donationTrendsValue = useMemo<DashboardDonationTrendsContextValue>(
    () => ({
      donationTrends,
      loading: loading.donationTrends,
      error: errors.donationTrends ?? null,
    }),
    [donationTrends, errors.donationTrends, loading.donationTrends]
  );

  const caseSummaryValue = useMemo<DashboardCaseSummaryContextValue>(
    () => ({
      caseSummary,
      loading: loading.caseSummary,
      error: errors.caseSummary ?? null,
    }),
    [caseSummary, errors.caseSummary, loading.caseSummary]
  );

  const taskSummaryValue = useMemo<DashboardTaskSummaryContextValue>(
    () => ({
      taskSummary,
      loading: loading.taskSummary,
      error: errors.taskSummary ?? null,
    }),
    [errors.taskSummary, loading.taskSummary, taskSummary]
  );

  const followUpSummaryValue = useMemo<DashboardFollowUpSummaryContextValue>(
    () => ({
      followUpSummary,
      loading: loading.followUpSummary,
      error: errors.followUpSummary ?? null,
    }),
    [errors.followUpSummary, followUpSummary, loading.followUpSummary]
  );

  const upcomingFollowUpsValue = useMemo<DashboardUpcomingFollowUpsContextValue>(
    () => ({
      upcomingFollowUps,
      loading: loading.upcomingFollowUps,
      error: errors.upcomingFollowUps ?? null,
    }),
    [errors.upcomingFollowUps, loading.upcomingFollowUps, upcomingFollowUps]
  );

  const assignedCasesValue = useMemo<DashboardAssignedCasesContextValue>(
    () => ({
      assignedCases,
      assignedCasesTotal,
      loading: loading.assignedCases,
      error: errors.assignedCases ?? null,
    }),
    [assignedCases, assignedCasesTotal, errors.assignedCases, loading.assignedCases]
  );

  return (
    <DashboardDataContext.Provider value={compatibilityValue}>
      <DashboardAnalyticsSummaryContext.Provider value={analyticsSummaryValue}>
        <DashboardDonationTrendsContext.Provider value={donationTrendsValue}>
          <DashboardCaseSummaryContext.Provider value={caseSummaryValue}>
            <DashboardTaskSummaryContext.Provider value={taskSummaryValue}>
              <DashboardFollowUpSummaryContext.Provider value={followUpSummaryValue}>
                <DashboardUpcomingFollowUpsContext.Provider value={upcomingFollowUpsValue}>
                  <DashboardAssignedCasesContext.Provider value={assignedCasesValue}>
                    {children}
                  </DashboardAssignedCasesContext.Provider>
                </DashboardUpcomingFollowUpsContext.Provider>
              </DashboardFollowUpSummaryContext.Provider>
            </DashboardTaskSummaryContext.Provider>
          </DashboardCaseSummaryContext.Provider>
        </DashboardDonationTrendsContext.Provider>
      </DashboardAnalyticsSummaryContext.Provider>
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  return useContext(DashboardDataContext);
}

export function useDashboardAnalyticsSummary() {
  return useContext(DashboardAnalyticsSummaryContext);
}

export function useDashboardDonationTrends() {
  return useContext(DashboardDonationTrendsContext);
}

export function useDashboardCaseSummary() {
  return useContext(DashboardCaseSummaryContext);
}

export function useDashboardTaskSummary() {
  return useContext(DashboardTaskSummaryContext);
}

export function useDashboardFollowUpSummary() {
  return useContext(DashboardFollowUpSummaryContext);
}

export function useDashboardUpcomingFollowUps() {
  return useContext(DashboardUpcomingFollowUpsContext);
}

export function useDashboardAssignedCases() {
  return useContext(DashboardAssignedCasesContext);
}
