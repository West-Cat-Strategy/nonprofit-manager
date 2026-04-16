export interface DashboardSettings {
  showWorkspaceSummary: boolean;
  showQuickLookup: boolean;
  showQuickActions: boolean;
  showFocusQueue: boolean;
  showPinnedWorkstreams: boolean;
  showModules: boolean;
  showInsightStrip: boolean;
}

export const defaultDashboardSettings: DashboardSettings = {
  showWorkspaceSummary: true,
  showQuickLookup: true,
  showQuickActions: true,
  showFocusQueue: true,
  showPinnedWorkstreams: true,
  showModules: true,
  showInsightStrip: true,
};

type LegacyDashboardSettings = Partial<DashboardSettings> & {
  showEngagementChart?: boolean;
  showVolunteerWidget?: boolean;
  kpis?: Record<string, boolean>;
};

export const normalizeDashboardSettings = (
  settings: LegacyDashboardSettings | null | undefined
): DashboardSettings => ({
  ...defaultDashboardSettings,
  showInsightStrip: settings?.showInsightStrip ?? settings?.showEngagementChart ?? defaultDashboardSettings.showInsightStrip,
  ...settings,
});
