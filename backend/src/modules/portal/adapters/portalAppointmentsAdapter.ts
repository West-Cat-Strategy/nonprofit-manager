import {
  listPortalAppointments,
  listPortalAppointmentSlots,
  bookPortalAppointmentSlot,
  createPortalManualAppointmentRequest,
  cancelPortalAppointment,
} from '@services/portalAppointmentSlotService';
import type { PortalAppointmentsPort } from '../types/ports';

export const createPortalAppointmentsAdapter = (): PortalAppointmentsPort => ({
  listPortalAppointments,
  listPortalAppointmentSlots,
  bookPortalAppointmentSlot,
  createPortalManualAppointmentRequest,
  cancelPortalAppointment,
});
