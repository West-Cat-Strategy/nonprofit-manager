/**
 * Activity Types
 * Type definitions for activity feed and audit logs
 */

export type ActivityType =
  | 'case_created'
  | 'case_updated'
  | 'case_status_changed'
  | 'case_assigned'
  | 'case_closed'
  | 'case_note_added'
  | 'donation_received'
  | 'donation_updated'
  | 'volunteer_hours_logged'
  | 'volunteer_assigned'
  | 'event_created'
  | 'event_registration'
  | 'contact_created'
  | 'contact_updated'
  | 'task_created'
  | 'task_completed';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  user_id: string | null;
  user_name: string | null;
  entity_type: 'case' | 'donation' | 'volunteer' | 'event' | 'contact' | 'task';
  entity_id: string;
  metadata?: Record<string, any>;
}

export interface ActivityFeedResponse {
  activities: Activity[];
  total: number;
}

export default {
  ActivityType: {} as ActivityType,
  Activity: {} as Activity,
  ActivityFeedResponse: {} as ActivityFeedResponse,
};
