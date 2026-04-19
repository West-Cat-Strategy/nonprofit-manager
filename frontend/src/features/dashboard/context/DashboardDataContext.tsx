/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { useDashboardDataLoader } from './useDashboardDataLoader';
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

export const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);
const DashboardAnalyticsSummaryContext = createContext<DashboardAnalyticsSummaryContextValue | null>(null);
const DashboardDonationTrendsContext = createContext<DashboardDonationTrendsContextValue | null>(null);
const DashboardCaseSummaryContext = createContext<DashboardCaseSummaryContextValue | null>(null);
const DashboardTaskSummaryContext = createContext<DashboardTaskSummaryContextValue | null>(null);
const DashboardFollowUpSummaryContext = createContext<DashboardFollowUpSummaryContextValue | null>(null);
const DashboardUpcomingFollowUpsContext = createContext<DashboardUpcomingFollowUpsContextValue | null>(null);
const DashboardAssignedCasesContext = createContext<DashboardAssignedCasesContextValue | null>(null);

interface DashboardDataProviderProps {
  children: ReactNode;
  lanes: readonly DashboardDataKey[];
}

export function DashboardDataProvider({ children, lanes }: DashboardDataProviderProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const userId = user?.id ?? null;
  const dashboardData = useDashboardDataLoader({
    lanes,
    isAuthenticated,
    userId,
  });

  const {
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
  } = dashboardData;

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
    <DashboardDataContext.Provider value={dashboardData}>
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
