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
  | 'conversation_resolved'
  | 'appointment_scheduled'
  | 'appointment_completed'
  | 'appointment_cancelled'
  | 'follow_up_completed'
  | 'attendance_recorded'
  | 'donation_received'
  | 'donation_updated'
  | 'volunteer_hours_logged'
  | 'volunteer_assigned'
  | 'event_created'
  | 'event_registration'
  | 'event_registration_updated'
  | 'event_check_in'
  | 'contact_created'
  | 'contact_updated'
  | 'contact_note_added'
  | 'public_form_submission'
  | 'newsletter_signup'
  | 'volunteer_interest_submitted'
  | 'public_donation_submitted'
  | 'portal_action'
  | 'task_created'
  | 'task_completed'
  | 'document_uploaded';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  user_id: string | null;
  user_name: string | null;
  entity_type:
    | 'case'
    | 'donation'
    | 'volunteer'
    | 'event'
    | 'contact'
    | 'task'
    | 'appointment'
    | 'follow_up'
    | 'conversation'
    | 'attendance';
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
