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

export const KPI_LABELS: Record<KpiKey, string> = {
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

export const defaultDashboardSettings: DashboardSettings = {
  showQuickLookup: true,
  showQuickActions: true,
  showModules: true,
  showEngagementChart: true,
  showVolunteerWidget: true,
  kpis: {
    totalDonations: true,
    avgDonation: true,
    activeAccounts: true,
    activeContacts: true,
    activeCases: true,
    volunteers: true,
    volunteerHours: true,
    events: true,
    engagement: true,
  },
};
