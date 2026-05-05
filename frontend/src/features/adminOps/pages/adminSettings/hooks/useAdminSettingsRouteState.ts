import { useEffect, useMemo, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  getAdminSettingsPath,
  parseAdminSettingsSection,
  type AdminSettingsSection,
} from '../../../adminRoutePaths';
import { adminSettingsTabGroups, adminSettingsTabs } from '../constants';

const ADMIN_SETTINGS_MODE_KEY = 'admin_settings_mode_v1';

const readPersistedMode = (): 'basic' | 'advanced' => {
  if (typeof window === 'undefined') {
    return 'basic';
  }

  const persisted = window.localStorage.getItem(ADMIN_SETTINGS_MODE_KEY);
  return persisted === 'advanced' ? 'advanced' : 'basic';
};

interface UseAdminSettingsRouteStateParams {
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export const useAdminSettingsRouteState = ({
  showAdvancedSettings,
  setShowAdvancedSettings,
}: UseAdminSettingsRouteStateParams) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { section: sectionParam } = useParams<{ section?: string }>();

  const activeSection = parseAdminSettingsSection(sectionParam) ?? 'dashboard';

  const setActiveSection = (nextSection: AdminSettingsSection, options?: { replace?: boolean }) => {
    navigate(
      {
        pathname: getAdminSettingsPath(nextSection),
        search: location.search,
      },
      options
    );
  };

  useEffect(() => {
    const sectionTab = adminSettingsTabs.find((tab) => tab.id === activeSection);
    if (sectionTab?.level === 'advanced' && !showAdvancedSettings) {
      setShowAdvancedSettings(true);
    }
  }, [activeSection, setShowAdvancedSettings, showAdvancedSettings]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        ADMIN_SETTINGS_MODE_KEY,
        showAdvancedSettings ? 'advanced' : 'basic'
      );
    }
  }, [showAdvancedSettings]);

  const { visibleTabIds, visibleTabMap, visibleTabGroups } = useMemo(() => {
    const tabs = adminSettingsTabs;
    const tabIds = tabs.map((tab) => tab.id);
    const tabMap = new Map(tabs.map((tab) => [tab.id, tab]));
    const tabGroups = adminSettingsTabGroups
      .map((group) => ({
        ...group,
        tabs: group.tabs.filter((tabId) => tabMap.has(tabId)),
      }))
      .filter((group) => group.tabs.length > 0);

    return {
      visibleTabIds: tabIds,
      visibleTabMap: tabMap,
      visibleTabGroups: tabGroups,
    };
  }, []);

  const activeTab =
    adminSettingsTabs.find((tab) => tab.id === activeSection) || adminSettingsTabs[0];
  const activeGroup = adminSettingsTabGroups.find((group) => group.tabs.includes(activeSection));

  const handleToggleAdvancedSettings = () => {
    if (showAdvancedSettings && activeTab.level === 'advanced') {
      setActiveSection('dashboard');
    }

    setShowAdvancedSettings((prev) => !prev);
  };

  const focusTab = (tabId: AdminSettingsSection) => {
    const tabNode = document.getElementById(`admin-settings-tab-${tabId}`);
    if (tabNode instanceof HTMLElement) {
      tabNode.focus();
    }
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tabId: AdminSettingsSection
  ) => {
    if (visibleTabIds.length === 0) {
      return;
    }

    const currentIndex = visibleTabIds.indexOf(tabId);
    if (currentIndex < 0) return;

    let targetIndex = currentIndex;
    if (event.key === 'ArrowRight') {
      targetIndex = (currentIndex + 1) % visibleTabIds.length;
    } else if (event.key === 'ArrowLeft') {
      targetIndex = (currentIndex - 1 + visibleTabIds.length) % visibleTabIds.length;
    } else if (event.key === 'Home') {
      targetIndex = 0;
    } else if (event.key === 'End') {
      targetIndex = visibleTabIds.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const targetTabId = visibleTabIds[targetIndex];
    setActiveSection(targetTabId);
    focusTab(targetTabId);
  };

  return {
    activeSection,
    activeTab,
    activeGroup,
    visibleTabIds,
    visibleTabMap,
    visibleTabGroups,
    setActiveSection,
    handleToggleAdvancedSettings,
    handleTabKeyDown,
  };
};

export const getInitialAdminSettingsMode = readPersistedMode;
