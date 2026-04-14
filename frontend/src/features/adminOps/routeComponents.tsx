import { lazy } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { getAdminSettingsPath, parseAdminSettingsSection } from './adminRoutePaths';

/**
 * MODULE-OWNERSHIP: admin route boundary
 *
 * Route components for admin routes must resolve through feature ownership.
 */

export const AdminSettings = lazy(() => import('./pages/AdminSettingsPage'));
export const UserSettings = lazy(() => import('./pages/UserSettingsPage'));
export const ApiSettings = lazy(() => import('./pages/ApiSettingsPage'));
export const NavigationSettings = lazy(() => import('./pages/NavigationSettingsPage'));
export const DataBackup = lazy(() => import('./pages/DataBackupPage'));
export const CommunicationsPage = lazy(() => import('./pages/EmailMarketingPage'));
export const SocialMedia = lazy(() => import('./pages/SocialMediaPage'));
export const PortalAdminPage = lazy(() => import('./pages/portalAdmin/PortalAdminPage'));

export const AdminSettingsSectionRoute = () => {
  const location = useLocation();
  const { section } = useParams<{ section?: string }>();

  if (!parseAdminSettingsSection(section)) {
    return (
      <Navigate
        to={{
          pathname: getAdminSettingsPath('dashboard'),
          search: location.search,
        }}
        replace
      />
    );
  }

  return <AdminSettings />;
};
