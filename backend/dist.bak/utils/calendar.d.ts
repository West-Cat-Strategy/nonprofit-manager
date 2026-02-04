/**
 * Calendar Utility
 * Generates iCalendar (.ics) files for events
 */
import type { Event } from '../types/event';
/**
 * Generate iCalendar (.ics) content for an event
 */
export declare const generateICS: (event: Event, organizerEmail?: string) => string;
/**
 * Generate Google Calendar URL for an event
 */
export declare const generateGoogleCalendarUrl: (event: Event) => string;
/**
 * Generate Outlook Web Calendar URL for an event
 */
export declare const generateOutlookCalendarUrl: (event: Event) => string;
declare const _default: {
    generateICS: (event: Event, organizerEmail?: string) => string;
    generateGoogleCalendarUrl: (event: Event) => string;
    generateOutlookCalendarUrl: (event: Event) => string;
};
export default _default;
//# sourceMappingURL=calendar.d.ts.map