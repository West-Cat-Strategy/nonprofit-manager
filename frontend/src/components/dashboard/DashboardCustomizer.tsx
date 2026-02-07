import { memo } from 'react';

export type KpiKey =
  | 'totalDonations'
  | 'avgDonation'
  | 'activeAccounts'
  | 'activeContacts'
  | 'activeCases'
  | 'volunteers'
  | 'volunteerHours'
  | 'events'
  | 'engagement';

export interface DashboardSettings {
  showQuickLookup: boolean;
  showQuickActions: boolean;
  showModules: boolean;
  showEngagementChart: boolean;
  showVolunteerWidget: boolean;
  kpis: Record<KpiKey, boolean>;
}

interface CheckboxItemProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CheckboxItem = memo(function CheckboxItem({ id, label, checked, onChange }: CheckboxItemProps) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
      />
      {label}
    </label>
  );
});

interface DashboardCustomizerProps {
  settings: DashboardSettings;
  onSettingsChange: (settings: DashboardSettings) => void;
  onReset: () => void;
}

const KPI_LABELS: Record<KpiKey, string> = {
  totalDonations: 'Total Donations',
  avgDonation: 'Avg. Donation',
  activeAccounts: 'Active Accounts',
  activeContacts: 'Active Contacts',
  activeCases: 'Active Cases',
  volunteers: 'Volunteers',
  volunteerHours: 'Volunteer Hours',
  events: 'Events',
  engagement: 'Engagement',
};

function DashboardCustomizer({ settings, onSettingsChange, onReset }: DashboardCustomizerProps) {
  const updateSection = (key: keyof Omit<DashboardSettings, 'kpis'>, value: boolean) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const updateKpi = (key: KpiKey, value: boolean) => {
    onSettingsChange({
      ...settings,
      kpis: { ...settings.kpis, [key]: value },
    });
  };

  return (
    <div
      className="mt-6 rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-sm"
      role="region"
      aria-label="Dashboard customization"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Visible Metrics</h2>
          <p className="text-sm text-slate-500">Choose which metrics and sections to show.</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-semibold text-slate-700 hover:text-slate-900 focus:outline-none focus:underline"
          aria-label="Reset dashboard settings to defaults"
        >
          Reset defaults
        </button>
      </div>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <fieldset className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4">
          <legend className="text-sm font-semibold text-slate-700 mb-3">Sections</legend>
          <div className="space-y-2">
            <CheckboxItem
              id="section-quick-lookup"
              label="Quick lookup"
              checked={settings.showQuickLookup}
              onChange={(v) => updateSection('showQuickLookup', v)}
            />
            <CheckboxItem
              id="section-quick-actions"
              label="Quick actions"
              checked={settings.showQuickActions}
              onChange={(v) => updateSection('showQuickActions', v)}
            />
            <CheckboxItem
              id="section-modules"
              label="Modules"
              checked={settings.showModules}
              onChange={(v) => updateSection('showModules', v)}
            />
            <CheckboxItem
              id="section-engagement-chart"
              label="Engagement chart"
              checked={settings.showEngagementChart}
              onChange={(v) => updateSection('showEngagementChart', v)}
            />
            <CheckboxItem
              id="section-volunteer-widget"
              label="Volunteer widget"
              checked={settings.showVolunteerWidget}
              onChange={(v) => updateSection('showVolunteerWidget', v)}
            />
          </div>
        </fieldset>
        <fieldset className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4">
          <legend className="text-sm font-semibold text-slate-700 mb-3">KPI cards</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(settings.kpis) as KpiKey[]).map((key) => (
              <CheckboxItem
                key={key}
                id={`kpi-${key}`}
                label={KPI_LABELS[key]}
                checked={settings.kpis[key]}
                onChange={(v) => updateKpi(key, v)}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

export default memo(DashboardCustomizer);
