import type { KeyboardEvent } from 'react';
import type { AdminSettingsSection } from '../../../adminRoutePaths';
import type { AdminSettingsTab, AdminSettingsTabGroup } from '../constants';

interface AdminSettingsSectionNavProps {
  activeSection: AdminSettingsSection;
  activeGroupLabel?: string;
  activeTabLabel: string;
  visibleTabGroups: Array<AdminSettingsTabGroup & { tabs: AdminSettingsSection[] }>;
  visibleTabMap: Map<AdminSettingsSection, AdminSettingsTab>;
  onSelectSection: (section: AdminSettingsSection) => void;
  onTabKeyDown: (event: KeyboardEvent<HTMLButtonElement>, tabId: AdminSettingsSection) => void;
}

export default function AdminSettingsSectionNav({
  activeSection,
  activeGroupLabel,
  activeTabLabel,
  visibleTabGroups,
  visibleTabMap,
  onSelectSection,
  onTabKeyDown,
}: AdminSettingsSectionNavProps) {
  return (
    <>
      <div className="app-shell-surface-opaque sticky top-14 z-10 mb-4 min-w-0 rounded-[var(--ui-radius-md)] border border-app-border px-4 py-3 shadow-sm sm:top-16">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-app-text-label">
              All admin sections visible
            </p>
            <p className="break-words text-sm text-[var(--app-text)]">
              You are here: <span className="font-bold">{activeTabLabel}</span>
              {activeGroupLabel ? (
                <span className="text-[var(--app-text-muted)]"> · {activeGroupLabel}</span>
              ) : null}
            </p>
          </div>
          <span className="inline-flex w-fit max-w-full rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold leading-tight text-app-text-muted">
            High-impact tools stay labeled, not hidden
          </span>
        </div>
      </div>

      <nav className="mb-5 space-y-3" role="tablist" aria-label="Admin settings sections">
        {visibleTabGroups.map((group) => (
          <section
            key={group.id}
            className="min-w-0 rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface p-3 shadow-sm"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wide text-app-text-heading">
                  {group.label}
                </h3>
                <p className="break-words text-xs text-app-text-muted">{group.description}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-app-text-muted">
                {group.tabs.length} sections
              </span>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
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
                    className={`inline-flex min-w-0 flex-wrap items-center gap-2 rounded-[var(--ui-radius-sm)] border px-3 py-2 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] ${
                      activeSection === tab.id
                        ? 'border-app-accent bg-app-accent text-[var(--app-accent-foreground)]'
                        : 'border-app-border bg-app-surface-muted text-app-text hover:bg-app-hover'
                    }`}
                  >
                    <span className="min-w-0 break-words">{tab.label}</span>
                    {tab.level === 'advanced' ? (
                      <span className="max-w-full rounded-full border border-current px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide opacity-80">
                        High impact
                      </span>
                    ) : null}
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
