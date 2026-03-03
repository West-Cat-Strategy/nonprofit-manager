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

