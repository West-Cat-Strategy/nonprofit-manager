import { lazy } from 'react';

export const Analytics = lazy(() => import('../pages/analytics/Analytics'));
export const CustomDashboard = lazy(() => import('../pages/analytics/CustomDashboard'));
export const ReportBuilder = lazy(() => import('../pages/analytics/ReportBuilder'));
export const SavedReports = lazy(() => import('../pages/analytics/SavedReports'));
export const OutcomesReport = lazy(() => import('../pages/analytics/OutcomesReport'));
export const ScheduledReports = lazy(() => import('../pages/analytics/ScheduledReports'));
