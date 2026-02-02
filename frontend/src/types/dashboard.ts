/**
 * Dashboard Types
 * Type definitions for customizable dashboard widgets and layouts
 */

/**
 * Available widget types
 */
export type WidgetType =
  | 'donation_summary'
  | 'recent_donations'
  | 'donation_trends'
  | 'volunteer_hours'
  | 'event_attendance'
  | 'recent_contacts'
  | 'case_summary'
  | 'upcoming_events'
  | 'quick_actions'
  | 'activity_feed';

/**
 * Widget size presets
 */
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

/**
 * Widget layout position
 */
export interface WidgetLayout {
  i: string; // Widget ID
  x: number; // X position in grid
  y: number; // Y position in grid
  w: number; // Width in grid units
  h: number; // Height in grid units
  minW?: number; // Minimum width
  minH?: number; // Minimum height
  maxW?: number; // Maximum width
  maxH?: number; // Maximum height
  static?: boolean; // Cannot be moved or resized
}

/**
 * Widget configuration
 */
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  enabled: boolean;
  layout: WidgetLayout;
  settings?: Record<string, any>;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id?: string;
  user_id: string;
  name: string;
  is_default: boolean;
  widgets: DashboardWidget[];
  layout: WidgetLayout[];
  breakpoints?: {
    lg: number;
    md: number;
    sm: number;
    xs: number;
  };
  cols?: {
    lg: number;
    md: number;
    sm: number;
    xs: number;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Widget data types
 */
export interface DonationSummaryData {
  total_donations: number;
  total_amount: number;
  average_donation: number;
  period_comparison: {
    donations_change: number;
    amount_change: number;
  };
}

export interface RecentDonation {
  id: string;
  donor_name: string;
  amount: number;
  date: string;
  status: string;
}

export interface VolunteerHoursData {
  total_hours: number;
  active_volunteers: number;
  hours_this_month: number;
  period_comparison: {
    hours_change: number;
    volunteers_change: number;
  };
}

export interface EventAttendanceData {
  total_events: number;
  total_attendees: number;
  upcoming_events: number;
  average_attendance: number;
}

export interface CaseSummaryData {
  total_cases: number;
  active_cases: number;
  closed_cases: number;
  urgent_cases: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'donation' | 'volunteer' | 'event' | 'case' | 'contact';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

/**
 * Widget template for creating new widgets
 */
export interface WidgetTemplate {
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  defaultLayout: Omit<WidgetLayout, 'i'>;
  category: 'analytics' | 'activity' | 'management' | 'quick-access';
}

/**
 * Default widget templates
 */
export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    type: 'donation_summary',
    title: 'Donation Summary',
    description: 'Overview of donation metrics and trends',
    icon: '💰',
    defaultSize: 'medium',
    defaultLayout: { x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
    category: 'analytics',
  },
  {
    type: 'recent_donations',
    title: 'Recent Donations',
    description: 'List of most recent donations',
    icon: '📝',
    defaultSize: 'medium',
    defaultLayout: { x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    category: 'activity',
  },
  {
    type: 'donation_trends',
    title: 'Donation Trends',
    description: 'Chart showing donation trends over time',
    icon: '📈',
    defaultSize: 'large',
    defaultLayout: { x: 0, y: 2, w: 8, h: 3, minW: 6, minH: 3 },
    category: 'analytics',
  },
  {
    type: 'volunteer_hours',
    title: 'Volunteer Hours',
    description: 'Summary of volunteer hours and activity',
    icon: '👥',
    defaultSize: 'medium',
    defaultLayout: { x: 0, y: 5, w: 4, h: 2, minW: 3, minH: 2 },
    category: 'analytics',
  },
  {
    type: 'event_attendance',
    title: 'Event Attendance',
    description: 'Overview of events and attendance',
    icon: '📅',
    defaultSize: 'medium',
    defaultLayout: { x: 4, y: 5, w: 4, h: 2, minW: 3, minH: 2 },
    category: 'analytics',
  },
  {
    type: 'recent_contacts',
    title: 'Recent Contacts',
    description: 'Recently added or updated contacts',
    icon: '👤',
    defaultSize: 'medium',
    defaultLayout: { x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    category: 'activity',
  },
  {
    type: 'case_summary',
    title: 'Case Summary',
    description: 'Overview of case management metrics',
    icon: '📋',
    defaultSize: 'medium',
    defaultLayout: { x: 8, y: 3, w: 4, h: 2, minW: 3, minH: 2 },
    category: 'management',
  },
  {
    type: 'upcoming_events',
    title: 'Upcoming Events',
    description: 'Calendar of upcoming events',
    icon: '🗓️',
    defaultSize: 'medium',
    defaultLayout: { x: 0, y: 7, w: 6, h: 3, minW: 4, minH: 2 },
    category: 'management',
  },
  {
    type: 'quick_actions',
    title: 'Quick Actions',
    description: 'Shortcuts to common tasks',
    icon: '⚡',
    defaultSize: 'small',
    defaultLayout: { x: 6, y: 7, w: 3, h: 2, minW: 2, minH: 2 },
    category: 'quick-access',
  },
  {
    type: 'activity_feed',
    title: 'Activity Feed',
    description: 'Recent activity across the organization',
    icon: '📰',
    defaultSize: 'medium',
    defaultLayout: { x: 9, y: 7, w: 3, h: 4, minW: 3, minH: 3 },
    category: 'activity',
  },
];

/**
 * Default dashboard configuration for new users
 */
export const DEFAULT_DASHBOARD_CONFIG: Omit<DashboardConfig, 'id' | 'user_id'> = {
  name: 'Default Dashboard',
  is_default: true,
  widgets: [
    {
      id: 'widget-donation-summary',
      type: 'donation_summary',
      title: 'Donation Summary',
      enabled: true,
      layout: { i: 'widget-donation-summary', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
    },
    {
      id: 'widget-recent-donations',
      type: 'recent_donations',
      title: 'Recent Donations',
      enabled: true,
      layout: { i: 'widget-recent-donations', x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    },
    {
      id: 'widget-donation-trends',
      type: 'donation_trends',
      title: 'Donation Trends',
      enabled: true,
      layout: { i: 'widget-donation-trends', x: 0, y: 2, w: 8, h: 3, minW: 6, minH: 3 },
    },
    {
      id: 'widget-quick-actions',
      type: 'quick_actions',
      title: 'Quick Actions',
      enabled: true,
      layout: { i: 'widget-quick-actions', x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    },
  ],
  layout: [
    { i: 'widget-donation-summary', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
    { i: 'widget-recent-donations', x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'widget-donation-trends', x: 0, y: 2, w: 8, h: 3, minW: 6, minH: 3 },
    { i: 'widget-quick-actions', x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
  ],
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
  cols: { lg: 12, md: 10, sm: 6, xs: 4 },
};

export default {
  WidgetType: {} as WidgetType,
  WidgetSize: {} as WidgetSize,
  WidgetLayout: {} as WidgetLayout,
  DashboardWidget: {} as DashboardWidget,
  DashboardConfig: {} as DashboardConfig,
  WidgetTemplate: {} as WidgetTemplate,
  WIDGET_TEMPLATES,
  DEFAULT_DASHBOARD_CONFIG,
};
