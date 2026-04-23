import { logPortalActivity } from '@services/domains/integration';
import type {
  AppointmentSlot,
  PortalAppointment,
} from '@modules/portalAdmin/services/portalAppointmentSlotService';
import {
  toPortalClientAppointmentSlotsPayload,
  toPortalClientAppointmentSummary,
  type PortalClientAppointmentSlotsPayload,
  type PortalClientAppointmentSummary,
} from '../mappers/portalMappers';
import type { PortalAppointmentsPort } from '../types/ports';

const normalizeUserAgent = (userAgent?: string | string[]): string | null =>
  typeof userAgent === 'string' ? userAgent : null;

export class PortalAppointmentsUseCase {
  constructor(private readonly appointmentsPort: PortalAppointmentsPort) {}

  list(
    contactId: string,
    filters?: {
      status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
      caseId?: string;
      from?: string;
      to?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalClientAppointmentSummary[]> {
    return this.appointmentsPort
      .listPortalAppointments(contactId, filters)
      .then((appointments) =>
        (appointments as PortalAppointment[]).map((appointment) =>
          toPortalClientAppointmentSummary(appointment)
        )
      );
  }

  listSlots(
    contactId: string,
    filters?: {
      caseId?: string;
      from?: string;
      to?: string;
    }
  ): Promise<PortalClientAppointmentSlotsPayload> {
    return this.appointmentsPort
      .listPortalAppointmentSlots(contactId, filters)
      .then((payload) =>
        toPortalClientAppointmentSlotsPayload(
          payload as {
            selected_case_id: string | null;
            selected_pointperson_user_id: string | null;
            slots: AppointmentSlot[];
          }
        )
      );
  }

  async bookSlot(input: {
    slotId: string;
    contactId: string;
    portalUserId: string;
    caseId: string | null;
    title: string | null;
    description: string | null;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<PortalClientAppointmentSummary> {
    const appointment = (await this.appointmentsPort.bookPortalAppointmentSlot({
      slotId: input.slotId,
      contactId: input.contactId,
      portalUserId: input.portalUserId,
      caseId: input.caseId,
      title: input.title,
      description: input.description,
    })) as PortalAppointment;

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'appointment.slot.book',
      details: `Booked appointment slot ${input.slotId}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return toPortalClientAppointmentSummary(appointment);
  }

  async createManualRequest(input: {
    contactId: string;
    portalUserId: string;
    caseId?: string | null;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string | null;
    location: string | null;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<PortalClientAppointmentSummary> {
    const appointment = (await this.appointmentsPort.createPortalManualAppointmentRequest({
      contactId: input.contactId,
      portalUserId: input.portalUserId,
      caseId: input.caseId,
      title: input.title,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
    })) as PortalAppointment;

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'appointment.request',
      details: `Requested appointment ${appointment.id}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return toPortalClientAppointmentSummary(appointment);
  }

  async cancel(input: {
    appointmentId: string;
    contactId: string;
    portalUserId: string;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<PortalClientAppointmentSummary | null> {
    const appointment = (await this.appointmentsPort.cancelPortalAppointment({
      appointmentId: input.appointmentId,
      contactId: input.contactId,
    })) as PortalAppointment | null;

    if (appointment) {
      await logPortalActivity({
        portalUserId: input.portalUserId,
        action: 'appointment.cancel',
        details: `Cancelled appointment ${input.appointmentId}`,
        ipAddress: input.ipAddress,
        userAgent: normalizeUserAgent(input.userAgent),
      });
    }

    return appointment ? toPortalClientAppointmentSummary(appointment) : null;
  }
}
