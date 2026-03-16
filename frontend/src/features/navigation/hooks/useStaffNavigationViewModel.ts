import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logoutAsync } from '../../auth/state';
import { canAccessAdminSettings } from '../../auth/state/adminAccess';
import { useNavigationPreferences } from '../../../hooks/useNavigationPreferences';
import { useWorkspaceModuleAccess } from '../../workspaceModules/useWorkspaceModuleAccess';
import { useBranding } from '../../../contexts/BrandingContext';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  getRouteCatalogEntryById,
  getStaffUtilityEntries,
  matchRouteCatalogEntry,
  normalizeRouteLocation,
} from '../../../routes/routeCatalog';
import { getAdminSettingsPath } from '../../adminOps/adminRoutePaths';
import type { NavigationDrawerLink } from '../../../components/navigation/MobileNavigationDrawer';
import type { ThemeId } from '../../../theme/themeRegistry';

const routeFlags = {
  VITE_TEAM_CHAT_ENABLED: import.meta.env.VITE_TEAM_CHAT_ENABLED,
};

export function useStaffNavigationViewModel() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { branding } = useBranding();
  const themeState = useTheme();
  const workspaceModules = useWorkspaceModuleAccess();
  const navigationPreferences = useNavigationPreferences();

  const currentLocation = `${location.pathname}${location.search}`;
  const normalizedCurrentLocation = useMemo(
    () => normalizeRouteLocation(currentLocation),
    [currentLocation]
  );
  const activeRouteIds = useMemo(() => {
    const ids = new Set<string>();
    let currentEntry = matchRouteCatalogEntry(currentLocation);

    while (currentEntry) {
      ids.add(currentEntry.id);
      currentEntry = currentEntry.parentId ? getRouteCatalogEntryById(currentEntry.parentId) : null;
    }

    return ids;
  }, [currentLocation]);

  const utilityEntries = useMemo<NavigationDrawerLink[]>(
    () =>
      getStaffUtilityEntries(routeFlags, workspaceModules).map((entry) => ({
        id: entry.id,
        path: entry.href || entry.path,
        label: entry.staffNav?.label || entry.title,
        shortLabel: entry.staffNav?.shortLabel || entry.staffNav?.label || entry.title,
        icon: entry.staffNav?.icon || '•',
        ariaLabel: entry.staffNav?.ariaLabel || entry.staffNav?.label || entry.title,
      })),
    [workspaceModules]
  );

  const alertsLink = utilityEntries.find((entry) => entry.path === '/alerts') ?? {
    id: 'alerts-overview',
    path: '/alerts',
    label: 'Alerts',
    shortLabel: 'Alerts',
    icon: '🚨',
    ariaLabel: 'Alerts',
  };
  const utilityNavLinks = utilityEntries.filter((entry) => entry.path !== alertsLink.path);
  const adminSettingsPath = getAdminSettingsPath('dashboard');
  const canOpenAdminSettings = canAccessAdminSettings(user);

  const hasActiveSecondaryItem = navigationPreferences.secondaryItems.some(
    (item) =>
      activeRouteIds.has(item.id) || normalizeRouteLocation(item.path) === normalizedCurrentLocation
  );
  const hasActiveUtilityItem = utilityNavLinks.some(
    (item) =>
      activeRouteIds.has(item.id) || normalizeRouteLocation(item.path) === normalizedCurrentLocation
  );

  const themeLabels: Record<ThemeId, string> = {
    neobrutalist: 'NB',
    'sea-breeze': 'SB',
    corporate: 'CP',
    'clean-modern': 'CM',
    glass: 'GL',
    'high-contrast': 'HC',
  };

  const handleLogout = useCallback(() => {
    dispatch(logoutAsync()).finally(() => navigate('/login'));
  }, [dispatch, navigate]);

  const isNavItemActive = useCallback(
    (id: string, path: string) =>
      activeRouteIds.has(id) || normalizeRouteLocation(path) === normalizedCurrentLocation,
    [activeRouteIds, normalizedCurrentLocation]
  );

  return {
    activeRouteIds,
    adminSettingsPath,
    alertsLink,
    branding,
    canOpenAdminSettings,
    currentLocation,
    handleLogout,
    hasActiveSecondaryItem,
    hasActiveUtilityItem,
    isNavItemActive,
    navigationPreferences,
    normalizedCurrentLocation,
    themeLabels,
    themeState,
    utilityEntries,
    utilityNavLinks,
    user,
    workspaceModules,
  };
}

export default useStaffNavigationViewModel;
