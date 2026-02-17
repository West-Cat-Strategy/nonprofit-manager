import { lazy } from 'react';

export const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));
export const UserSettings = lazy(() => import('../pages/admin/UserSettings'));
export const ApiSettings = lazy(() => import('../pages/admin/ApiSettings'));
export const AlertsConfig = lazy(() => import('../pages/admin/AlertsConfig'));
export const NavigationSettings = lazy(() => import('../pages/admin/NavigationSettings'));
export const DataBackup = lazy(() => import('../pages/admin/DataBackup'));
export const EmailMarketing = lazy(() => import('../pages/admin/EmailMarketing'));
