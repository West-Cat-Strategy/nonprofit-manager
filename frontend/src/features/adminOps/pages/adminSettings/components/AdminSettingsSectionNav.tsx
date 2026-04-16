import type { KeyboardEvent } from 'react';
import type { AdminSettingsSection } from '../../../adminRoutePaths';
import type {
  AdminSettingsTab,
  AdminSettingsTabGroup,
} from '../constants';

interface AdminSettingsSectionNavProps {
  activeSection: AdminSettingsSection;
  activeGroupLabel?: string;
  showAdvancedSettings: boolean;
  activeTabLabel: string;
  visibleTabGroups: Array<AdminSettingsTabGroup & { tabs: AdminSettingsSection[] }>;
  visibleTabMap: Map<AdminSettingsSection, AdminSettingsTab>;
  onSelectSection: (section: AdminSettingsSection) => void;
  onToggleAdvancedSettings: () => void;
  onTabKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    tabId: AdminSettingsSection
  ) => void;
}

export default function AdminSettingsSectionNav({
  activeSection,
  activeGroupLabel,
  showAdvancedSettings,
  activeTabLabel,
  visibleTabGroups,
  visibleTabMap,
  onSelectSection,
  onToggleAdvancedSettings,
  onTabKeyDown,
}: AdminSettingsSectionNavProps) {
  return (
    <>
      <div className="app-shell-surface-opaque sticky top-14 z-10 mb-4 border-b-2 border-[var(--app-border)] shadow-sm sm:top-16">
        <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-[var(--app-text-muted)]">
              Showing {showAdvancedSettings ? 'all sections' : 'basic sections'}.
            </p>
            <p className="text-sm text-[var(--app-text)]">
              You are here: <span className="font-bold">{activeTabLabel}</span>
              {activeGroupLabel ? (
                <span className="text-[var(--app-text-muted)]"> · {activeGroupLabel}</span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleAdvancedSettings}
            className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-bold uppercase hover:bg-[var(--app-surface-muted)]"
          >
            {showAdvancedSettings ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        </div>
      </div>

      <nav className="mb-6 space-y-4" role="tablist" aria-label="Admin settings sections">
        {visibleTabGroups.map((group) => (
          <section
            key={group.id}
            className="border-t border-[var(--app-border)] pt-3 first:border-t-0 first:pt-0"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--app-text)]">
                  {group.label}
                </h3>
                <p className="text-xs text-[var(--app-text-muted)]">{group.description}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
                {group.tabs.length} sections
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.tabs.map((tabId) => {
                const tab = visibleTabMap.get(tabId);
                if (!tab) {
                  return null;
                }

                return (
                  <button
                    key={tab.id}
                    id={`admin-settings-tab-${tab.id}`}
                    type="button"
                    onClick={() => onSelectSection(tab.id)}
                    onKeyDown={(event) => onTabKeyDown(event, tab.id)}
                    role="tab"
                    aria-selected={activeSection === tab.id}
                    aria-controls={`admin-settings-panel-${tab.id}`}
                    tabIndex={activeSection === tab.id ? 0 : -1}
                    className={`border-b-4 px-4 py-3 text-sm font-bold uppercase whitespace-nowrap transition-colors ${
                      activeSection === tab.id
                        ? 'border-[var(--loop-yellow)] bg-[var(--loop-yellow)] text-[var(--app-text)]'
                        : 'border-transparent text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </>
  );
}
