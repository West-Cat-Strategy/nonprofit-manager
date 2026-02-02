/**
 * Calendar Utility
 * Generates iCalendar (.ics) files for events
 */

import type { Event } from '../types/event';

/**
 * Format date to iCalendar format (YYYYMMDDTHHMMSSZ)
 */
const formatICSDate = (date: Date): string => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

/**
 * Escape special characters in iCalendar text fields
 */
const escapeICSText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Build location string from event address fields
 */
const buildLocation = (event: Event): string => {
  const parts: string[] = [];

  if (event.location_name) parts.push(event.location_name);
  if (event.address_line1) parts.push(event.address_line1);
  if (event.address_line2) parts.push(event.address_line2);

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
 * Generate a unique identifier for the event
 */
const generateUID = (eventId: string, domain: string = 'nonprofit-manager.local'): string => {
  return `${eventId}@${domain}`;
};

/**
 * Generate iCalendar (.ics) content for an event
 */
export const generateICS = (event: Event, organizerEmail?: string): string => {
  const now = new Date();
  const uid = generateUID(event.event_id);
  const location = buildLocation(event);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nonprofit Manager//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(event.start_date)}`,
    `DTEND:${formatICSDate(event.end_date)}`,
    `SUMMARY:${escapeICSText(event.event_name)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (location) {
    lines.push(`LOCATION:${escapeICSText(location)}`);
  }

  if (organizerEmail) {
    lines.push(`ORGANIZER:mailto:${organizerEmail}`);
  }

  // Add event status
  const statusMap: Record<string, string> = {
    planned: 'TENTATIVE',
    active: 'CONFIRMED',
    completed: 'CONFIRMED',
    cancelled: 'CANCELLED',
    postponed: 'TENTATIVE',
  };

  if (event.status && statusMap[event.status]) {
    lines.push(`STATUS:${statusMap[event.status]}`);
  }

  // Add created and last modified timestamps
  lines.push(`CREATED:${formatICSDate(event.created_at)}`);
  lines.push(`LAST-MODIFIED:${formatICSDate(event.updated_at)}`);

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
};

/**
 * Generate Google Calendar URL for an event
 */
export const generateGoogleCalendarUrl = (event: Event): string => {
  const params = new URLSearchParams();

  params.set('action', 'TEMPLATE');
  params.set('text', event.event_name);

  // Google Calendar uses a different date format
  const startDate = new Date(event.start_date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endDate = new Date(event.end_date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
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
 * Generate Outlook Web Calendar URL for an event
 */
export const generateOutlookCalendarUrl = (event: Event): string => {
  const params = new URLSearchParams();

  params.set('rru', 'addevent');
  params.set('subject', event.event_name);

  // Outlook uses ISO format
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

export default {
  generateICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
};
