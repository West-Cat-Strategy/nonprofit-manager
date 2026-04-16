import { memo } from 'react';
import type { DashboardSettings } from '../types/viewSettings';

interface CheckboxItemProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CheckboxItem = memo(function CheckboxItem({
  id,
  label,
  description,
  checked,
  onChange,
}: CheckboxItemProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-app-border/70 bg-app-surface px-4 py-3 transition hover:bg-app-hover"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 rounded border-app-input-border text-app-text focus:ring-app-accent"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-app-text-heading">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-app-text-muted">{description}</span>
      </span>
    </label>
  );
});

interface DashboardViewSettingsPanelProps {
  settings: DashboardSettings;
  onSettingsChange: (settings: DashboardSettings) => void;
  onReset: () => void;
}

function DashboardViewSettingsPanel({
  settings,
  onSettingsChange,
  onReset,
}: DashboardViewSettingsPanelProps) {
  const updateSection = (key: keyof DashboardSettings, value: boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <section
      className="rounded-3xl border border-app-border/70 bg-app-surface/90 p-5 shadow-sm"
      role="region"
      aria-label="Dashboard view settings"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
            View Settings
          </p>
          <h2 className="mt-2 text-xl font-black uppercase tracking-[0.03em] text-app-text-heading">
            Choose what appears on the workbench
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-app-text-muted">
            Keep the fast-launch dashboard focused on the sections that help you move through daily work.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
        >
          Reset defaults
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <CheckboxItem
          id="dashboard-section-workspace-summary"
          label="Workspace summary"
          description="A quick pulse on your pinned modules, urgent cases, and due work."
          checked={settings.showWorkspaceSummary}
          onChange={(value) => updateSection('showWorkspaceSummary', value)}
        />
        <CheckboxItem
          id="dashboard-section-quick-lookup"
          label="Quick lookup"
          description="The people search box for jumping straight into records."
          checked={settings.showQuickLookup}
          onChange={(value) => updateSection('showQuickLookup', value)}
        />
        <CheckboxItem
          id="dashboard-section-quick-actions"
          label="Quick actions"
          description="A launch strip for common staff actions and intake flows."
          checked={settings.showQuickActions}
          onChange={(value) => updateSection('showQuickActions', value)}
        />
        <CheckboxItem
          id="dashboard-section-focus-queue"
          label="Focus queue"
          description="Operational cards for urgent cases, due work, and your assigned queue."
          checked={settings.showFocusQueue}
          onChange={(value) => updateSection('showFocusQueue', value)}
        />
        <CheckboxItem
          id="dashboard-section-pinned"
          label="Pinned shortcuts"
          description="Your saved shortcuts surfaced as compact workstream links."
          checked={settings.showPinnedWorkstreams}
          onChange={(value) => updateSection('showPinnedWorkstreams', value)}
        />
        <CheckboxItem
          id="dashboard-section-modules"
          label="Enabled workstreams"
          description="The broader list of modules currently enabled in staff navigation."
          checked={settings.showModules}
          onChange={(value) => updateSection('showModules', value)}
        />
        <CheckboxItem
          id="dashboard-section-insights"
          label="Insight strip"
          description="A compact lower-page view of donations, volunteers, events, and engagement."
          checked={settings.showInsightStrip}
          onChange={(value) => updateSection('showInsightStrip', value)}
        />
      </div>
    </section>
  );
}

export default memo(DashboardViewSettingsPanel);
