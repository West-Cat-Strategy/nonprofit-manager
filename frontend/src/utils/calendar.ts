/**
 * Calendar Utility
 * Generate calendar links for events (client-side)
 */

interface EventData {
  event_id: string;
  event_name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  location_name?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

/**
 * Build location string from event address fields
 */
const buildLocation = (event: EventData): string => {
  const parts: string[] = [];

  if (event.location_name) parts.push(event.location_name);
  if (event.address_line1) parts.push(event.address_line1);

  const cityStateZip: string[] = [];
  if (event.city) cityStateZip.push(event.city);
  if (event.state_province) cityStateZip.push(event.state_province);
  if (event.postal_code) cityStateZip.push(event.postal_code);

  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }

  if (event.country) parts.push(event.country);

  return parts.join(', ');
};

/**
 * Format date to Google Calendar format (YYYYMMDDTHHMMSSZ)
 */
const formatGoogleDate = (dateStr: string): string => {
  return new Date(dateStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

/**
 * Generate Google Calendar URL
 */
export const generateGoogleCalendarUrl = (event: EventData): string => {
  const params = new URLSearchParams();

  params.set('action', 'TEMPLATE');
  params.set('text', event.event_name);

  const startDate = formatGoogleDate(event.start_date);
  const endDate = formatGoogleDate(event.end_date);
  params.set('dates', `${startDate}/${endDate}`);

  if (event.description) {
    params.set('details', event.description);
  }

  const location = buildLocation(event);
  if (location) {
    params.set('location', location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate Outlook Web Calendar URL
 */
export const generateOutlookCalendarUrl = (event: EventData): string => {
  const params = new URLSearchParams();

  params.set('rru', 'addevent');
  params.set('subject', event.event_name);
  params.set('startdt', new Date(event.start_date).toISOString());
  params.set('enddt', new Date(event.end_date).toISOString());

  if (event.description) {
    params.set('body', event.description);
  }

  const location = buildLocation(event);
  if (location) {
    params.set('location', location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

/**
 * Generate Yahoo Calendar URL
 */
export const generateYahooCalendarUrl = (event: EventData): string => {
  const params = new URLSearchParams();

  params.set('v', '60');
  params.set('title', event.event_name);

  // Yahoo uses different date format
  const startDate = new Date(event.start_date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endDate = new Date(event.end_date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  params.set('st', startDate);
  params.set('et', endDate);

  if (event.description) {
    params.set('desc', event.description);
  }

  const location = buildLocation(event);
  if (location) {
    params.set('in_loc', location);
  }

  return `https://calendar.yahoo.com/?${params.toString()}`;
};

/**
 * Get .ics download URL from API
 */
export const getIcsDownloadUrl = (eventId: string): string => {
  return `/api/events/${eventId}/calendar.ics`;
};

export default {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateYahooCalendarUrl,
  getIcsDownloadUrl,
};
