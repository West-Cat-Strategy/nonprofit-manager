import { lazy } from 'react';

export const Analytics = lazy(() => import('../features/analytics/pages/AnalyticsPage'));
export const AlertsOverview = lazy(() => import('../features/alerts/pages/AlertsConfigPage'));
export const AlertInstances = lazy(() => import('../features/alerts/pages/AlertInstancesPage'));
export const AlertHistory = lazy(() => import('../features/alerts/pages/AlertHistoryPage'));
export const CustomDashboard = lazy(() => import('../features/dashboard/pages/CustomDashboardPage'));
