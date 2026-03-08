import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  getAdminSettingsPath,
  parseAdminSettingsSection,
  resolveLegacyAdminSettingsLocation,
} from '../features/adminOps/adminRoutePaths';
import { resolveRouteCatalogAlias } from './routeCatalog';
import { AdminSettings } from './adminRouteComponents';

export const RouteCatalogAliasRedirect = () => {
  const location = useLocation();
  const currentLocation = `${location.pathname}${location.search}`;
  const targetLocation = resolveRouteCatalogAlias(currentLocation);

  if (!targetLocation) {
    throw new Error(`Missing canonical redirect target for route alias: ${currentLocation}`);
  }

  return <Navigate to={targetLocation} replace />;
};

export const AdminSettingsLegacyRedirect = () => {
  const location = useLocation();
  const currentLocation = `${location.pathname}${location.search}`;
  return <Navigate to={resolveLegacyAdminSettingsLocation(currentLocation)} replace />;
};

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
