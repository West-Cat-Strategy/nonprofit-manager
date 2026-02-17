/**
 * Plausible Analytics Integration
 * Utility functions for tracking custom events with Plausible
 */

// Type declaration for Plausible Analytics global function injected by script tag
type PlausibleFunction = (eventName: string, options?: { props?: Record<string, string | number | boolean>; revenue?: { amount: number; currency: string }; u?: string }) => void;

declare global {
  interface Window {
    plausible?: PlausibleFunction;
  }
}

export interface PlausibleEventOptions {
  props?: Record<string, string | number | boolean>;
  revenue?: {
    amount: number;
    currency: string;
  };
}

/**
 * Track a custom event with Plausible
 * @param eventName - Name of the event to track
 * @param options - Optional event properties and revenue data
 */
export const trackEvent = (eventName: string, options?: PlausibleEventOptions): void => {
  // Check if Plausible is loaded
  if (typeof window === 'undefined' || !window.plausible) {
    if (import.meta.env.DEV) {
      console.warn('Plausible not loaded. Event not tracked:', eventName, options);
    }
    return;
  }

  const plausible = window.plausible;

  try {
    if (options?.revenue) {
      // Track revenue event
      plausible(eventName, {
        props: {
          ...options.props,
          amount: options.revenue.amount,
          currency: options.revenue.currency,
        },
        revenue: {
          amount: options.revenue.amount,
          currency: options.revenue.currency,
        },
      });
    } else if (options?.props) {
      // Track event with custom properties
      plausible(eventName, { props: options.props });
    } else {
      // Track simple event
      plausible(eventName);
    }
  } catch (error) {
    console.error('Error tracking Plausible event:', error);
  }
};

/**
 * Track page view manually
 * Useful for SPAs when you want to track route changes
 * @param url - The URL to track (optional, defaults to current location)
 */
export const trackPageView = (url?: string): void => {
  if (typeof window === 'undefined' || !window.plausible) {
    return;
  }

  try {
    window.plausible('pageview', { u: url || window.location.href });
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

/**
 * Predefined event tracking functions for common nonprofit manager actions
 */
export const PlausibleEvents = {
  // Donation events
  donationCreated: (amount: number, method: string) =>
    trackEvent('Donation Created', {
      props: { method },
      revenue: { amount, currency: 'USD' },
    }),

  donationUpdated: (amount: number) =>
    trackEvent('Donation Updated', {
      revenue: { amount, currency: 'USD' },
    }),

  donationDeleted: () => trackEvent('Donation Deleted'),

  // Donor events
  donorCreated: (type: string) =>
    trackEvent('Donor Created', { props: { type } }),

  donorUpdated: () => trackEvent('Donor Updated'),

  // Event management
  eventCreated: (eventType: string) =>
    trackEvent('Event Created', { props: { event_type: eventType } }),

  eventRegistration: (eventId: string) =>
    trackEvent('Event Registration', { props: { event_id: eventId } }),

  eventCheckIn: () => trackEvent('Event Check-In'),

  // Volunteer management
  volunteerCreated: () => trackEvent('Volunteer Created'),

  volunteerHoursLogged: (hours: number, activity: string) =>
    trackEvent('Volunteer Hours Logged', {
      props: { hours: hours.toString(), activity },
    }),

  // Case management
  caseCreated: (priority: string, category: string) =>
    trackEvent('Case Created', { props: { priority, category } }),

  caseUpdated: (status: string) =>
    trackEvent('Case Updated', { props: { status } }),

  caseAssigned: () => trackEvent('Case Assigned'),

  // Dashboard & Analytics
  dashboardCustomized: () => trackEvent('Dashboard Customized'),

  widgetAdded: (widgetType: string) =>
    trackEvent('Widget Added', { props: { widget_type: widgetType } }),

  reportExported: (reportType: string, format: string) =>
    trackEvent('Report Exported', { props: { report_type: reportType, format } }),

  // Alert events
  alertCreated: (metricType: string, severity: string) =>
    trackEvent('Alert Created', { props: { metric_type: metricType, severity } }),

  alertTriggered: (alertName: string) =>
    trackEvent('Alert Triggered', { props: { alert_name: alertName } }),

  // User actions
  login: (method: string) =>
    trackEvent('Login', { props: { method } }),

  logout: () => trackEvent('Logout'),

  settingsChanged: (section: string) =>
    trackEvent('Settings Changed', { props: { section } }),

  // Search & Filter
  searchPerformed: (searchType: string, resultsCount: number) =>
    trackEvent('Search Performed', {
      props: { search_type: searchType, results: resultsCount.toString() },
    }),

  filterApplied: (filterType: string) =>
    trackEvent('Filter Applied', { props: { filter_type: filterType } }),

  // Error tracking
  errorOccurred: (errorType: string, page: string) =>
    trackEvent('Error Occurred', { props: { error_type: errorType, page } }),
};

/**
 * Hook for tracking page views on route changes
 * Import and use in your router setup
 */
export const usePlausiblePageTracking = (): void => {
  if (typeof window !== 'undefined') {
    // Track initial page view
    trackPageView();
  }
};
