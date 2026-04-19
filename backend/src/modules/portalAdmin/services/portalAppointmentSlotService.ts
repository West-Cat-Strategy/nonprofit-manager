export interface AppointmentSlot {
  id: string;
  pointperson_user_id: string;
  case_id: string | null;
  title: string | null;
  details: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  status: 'open' | 'closed' | 'cancelled';
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  case_number?: string | null;
  case_title?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
  pointperson_email?: string | null;
  available_count?: number;
}

export interface PortalAppointment {
  id: string;
  contact_id: string;
  case_id: string | null;
  pointperson_user_id: string | null;
  slot_id: string | null;
  request_type: 'manual_request' | 'slot_booking';
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  case_number?: string | null;
  case_title?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
  pointperson_email?: string | null;
  portal_user_id?: string | null;
  portal_email?: string | null;
  contact_name?: string | null;
  next_reminder_at?: string | null;
  pending_reminder_jobs?: number;
  last_reminder_sent_at?: string | null;
  reminder_offered?: boolean;
  attendance_state?: 'scheduled' | 'attended' | 'cancelled' | 'no_show';
  linked_note_count?: number;
  linked_outcome_count?: number;
  missing_note?: boolean;
  missing_outcome?: boolean;
  missing_reminder?: boolean;
}

export { listPortalAppointmentSlots, listAdminAppointmentSlots, listAdminAppointments, listPortalAppointments, getSlotById, getAppointmentById } from './portalAppointmentSlotService/queries';
export { createAppointmentSlot, updateAppointmentSlot, deleteAppointmentSlot, createPortalManualAppointmentRequest } from './portalAppointmentSlotService/commands';
export { bookPortalAppointmentSlot, cancelPortalAppointment, updateAppointmentStatusByStaff, checkInAppointmentByStaff } from './portalAppointmentSlotService/scheduling';
