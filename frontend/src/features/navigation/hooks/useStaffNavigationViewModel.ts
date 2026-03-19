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
import { THEME_IDS, THEME_REGISTRY, type ThemeId } from '../../../theme/themeRegistry';

const routeFlags = {
  VITE_TEAM_CHAT_ENABLED: import.meta.env.VITE_TEAM_CHAT_ENABLED,
};

const themeLabels = THEME_IDS.reduce(
  (labels, themeId) => {
    labels[themeId] = THEME_REGISTRY[themeId].shortLabel;
    return labels;
  },
  {} as Record<ThemeId, string>
);

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
  const currentRouteEntry = useMemo(
    () => matchRouteCatalogEntry(currentLocation),
    [currentLocation]
  );
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
  const mobileNavigationPreferences = useMemo(() => {
    const orderedItems = navigationPreferences.enabledItems
      .filter((item) => item.group !== 'utility')
      .map((item, index) => ({
        item,
        index,
        mobilePriority: getRouteCatalogEntryById(item.id)?.mobilePriority ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((left, right) => {
        if (left.mobilePriority !== right.mobilePriority) {
          return left.mobilePriority - right.mobilePriority;
        }

        return left.index - right.index;
      })
      .map(({ item }) => item);

    return {
      primaryItems: orderedItems.slice(0, 4),
      secondaryItems: orderedItems.slice(4),
    };
  }, [navigationPreferences.enabledItems]);
  const mobileHeaderLinks = useMemo(
    () =>
      utilityEntries.filter((entry) => getRouteCatalogEntryById(entry.id)?.showInMobileHeader),
    [utilityEntries]
  );
  const mobileDrawerUtilityLinks = useMemo(
    () =>
      utilityEntries.filter(
        (entry) => getRouteCatalogEntryById(entry.id)?.showInMobileDrawerUtilities
      ),
    [utilityEntries]
  );

  const alertsLink = utilityEntries.find((entry) => entry.path === '/alerts') ?? {
    id: 'alerts-overview',
    path: '/alerts',
    label: 'Alerts',
    shortLabel: 'Alerts',
    icon: '🚨',
    ariaLabel: 'Alerts',
  };
  const mobileAlertsLink =
    mobileHeaderLinks.find((entry) => entry.path === alertsLink.path) ?? alertsLink;
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
    currentRouteTitle:
      currentRouteEntry?.staffNav?.label ??
      currentRouteEntry?.breadcrumbLabel ??
      currentRouteEntry?.title ??
      'Workspace',
    handleLogout,
    hasActiveSecondaryItem,
    hasActiveUtilityItem,
    isNavItemActive,
    mobileAlertsLink,
    mobileDrawerUtilityLinks,
    mobileHeaderLinks,
    mobileNavigationPreferences,
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
