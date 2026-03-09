import { lazy } from 'react';

export const Analytics = lazy(() => import('../features/analytics/pages/AnalyticsPage'));
export const AlertsOverview = lazy(() => import('../features/alerts/pages/AlertsConfigPage'));
export const AlertInstances = lazy(() => import('../features/alerts/pages/AlertInstancesPage'));
export const AlertHistory = lazy(() => import('../features/alerts/pages/AlertHistoryPage'));
export const CustomDashboard = lazy(() => import('../features/dashboard/pages/CustomDashboardPage'));
export const ReportBuilder = lazy(() => import('../features/reports/pages/ReportBuilderPage'));
export const ReportTemplates = lazy(() => import('../features/reports/pages/ReportTemplatesPage'));
export const SavedReports = lazy(() => import('../features/savedReports/pages/SavedReportsPage'));
export const OutcomesReport = lazy(() => import('../features/reports/pages/OutcomesReportPage'));
export const WorkflowCoverageReport = lazy(
  () => import('../features/reports/pages/WorkflowCoverageReportPage')
);
export const ScheduledReports = lazy(() => import('../features/scheduledReports/pages/ScheduledReportsPage'));
