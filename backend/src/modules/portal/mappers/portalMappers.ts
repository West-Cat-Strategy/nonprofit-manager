import type {
  AppointmentSlot,
  PortalAppointment,
} from '@modules/portalAdmin/services/portalAppointmentSlotService';

export const normalizePortalStatus = (
  value: unknown
): 'open' | 'closed' | 'archived' | undefined => {
  if (value === 'open' || value === 'closed' || value === 'archived') {
    return value;
  }

  return undefined;
};

export interface PortalClientAppointmentSummary {
  id: string;
  case_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  location: string | null;
  case_number: string | null;
  case_title: string | null;
  request_type: 'manual_request' | 'slot_booking';
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
}

export interface PortalClientAppointmentSlot {
  id: string;
  title: string | null;
  details: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  available_count: number;
  status: 'open' | 'closed' | 'cancelled';
  case_number: string | null;
  case_title: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
}

export interface PortalClientAppointmentSlotsPayload {
  selected_case_id: string | null;
  selected_pointperson_user_id: string | null;
  slots: PortalClientAppointmentSlot[];
}

export const toPortalClientAppointmentSummary = (
  appointment: PortalAppointment
): PortalClientAppointmentSummary => ({
  id: appointment.id,
  case_id: appointment.case_id,
  title: appointment.title,
  description: appointment.description ?? null,
  start_time: appointment.start_time,
  end_time: appointment.end_time ?? null,
  status: appointment.status,
  location: appointment.location ?? null,
  case_number: appointment.case_number ?? null,
  case_title: appointment.case_title ?? null,
  request_type: appointment.request_type,
  pointperson_first_name: appointment.pointperson_first_name ?? null,
  pointperson_last_name: appointment.pointperson_last_name ?? null,
});

export const toPortalClientAppointmentSlot = (
  slot: AppointmentSlot
): PortalClientAppointmentSlot => ({
  id: slot.id,
  title: slot.title ?? null,
  details: slot.details ?? null,
  location: slot.location ?? null,
  start_time: slot.start_time,
  end_time: slot.end_time,
  available_count: slot.available_count ?? 0,
  status: slot.status,
  case_number: slot.case_number ?? null,
  case_title: slot.case_title ?? null,
  pointperson_first_name: slot.pointperson_first_name ?? null,
  pointperson_last_name: slot.pointperson_last_name ?? null,
});

export const toPortalClientAppointmentSlotsPayload = (payload: {
  selected_case_id: string | null;
  selected_pointperson_user_id: string | null;
  slots: AppointmentSlot[];
}): PortalClientAppointmentSlotsPayload => ({
  selected_case_id: payload.selected_case_id,
  selected_pointperson_user_id: payload.selected_pointperson_user_id,
  slots: payload.slots.map(toPortalClientAppointmentSlot),
});
