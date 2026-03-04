import { lazy } from 'react';

export const AdminSettings = lazy(() => import('../features/adminOps/pages/AdminSettingsPage'));
export const UserSettings = lazy(() => import('../features/adminOps/pages/UserSettingsPage'));
export const ApiSettings = lazy(() => import('../features/adminOps/pages/ApiSettingsPage'));
export const AlertsConfig = lazy(() => import('../features/alerts/pages/AlertsConfigPage'));
export const NavigationSettings = lazy(() => import('../features/adminOps/pages/NavigationSettingsPage'));
export const DataBackup = lazy(() => import('../features/adminOps/pages/DataBackupPage'));
export const EmailMarketing = lazy(() => import('../features/adminOps/pages/EmailMarketingPage'));
export const PortalAdminPage = lazy(() => import('../features/adminOps/pages/portalAdmin/PortalAdminPage'));
