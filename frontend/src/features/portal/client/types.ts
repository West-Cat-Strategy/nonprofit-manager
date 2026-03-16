export type PortalStreamStatus = 'disabled' | 'connecting' | 'connected' | 'error';

export type PortalRealtimeEventName =
  | 'portal.thread.updated'
  | 'portal.appointment.updated'
  | 'portal.slot.updated';

export interface PortalRealtimeEventPayload {
  event_id: string;
  occurred_at: string;
  entity_id: string;
  case_id: string | null;
  status: string | null;
  actor_type: 'portal' | 'staff' | 'system';
  source: string;
  action?: 'message.created' | 'thread.read' | 'thread.status.updated' | 'thread.updated';
  thread?: {
    id: string;
    contact_id: string;
    case_id: string | null;
    subject: string | null;
    status: string;
    last_message_at: string;
    last_message_preview: string | null;
    case_number: string | null;
    case_title: string | null;
    pointperson_user_id: string | null;
    pointperson_first_name: string | null;
    pointperson_last_name: string | null;
    portal_email: string | null;
    portal_unread_count: number;
    staff_unread_count: number;
  } | null;
  message?: {
    id: string;
    thread_id: string;
    sender_type: 'portal' | 'staff' | 'system';
    sender_portal_user_id: string | null;
    sender_user_id: string | null;
    sender_display_name: string | null;
    message_text: string;
    is_internal: boolean;
    client_message_id: string | null;
    created_at: string;
    read_by_portal_at: string | null;
    read_by_staff_at: string | null;
  } | null;
  client_message_id?: string | null;
}

export interface PortalThreadQuery {
  status?: 'open' | 'closed' | 'archived';
  case_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PortalAppointmentQuery {
  status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  case_id?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
