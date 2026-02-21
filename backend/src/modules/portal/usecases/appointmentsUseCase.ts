import { logPortalActivity } from '@services/domains/integration';
import type { PortalAppointmentsPort } from '../types/ports';

const normalizeUserAgent = (userAgent?: string | string[]): string | null =>
  typeof userAgent === 'string' ? userAgent : null;

export class PortalAppointmentsUseCase {
  constructor(private readonly appointmentsPort: PortalAppointmentsPort) {}

  list(contactId: string): Promise<unknown[]> {
    return this.appointmentsPort.listPortalAppointments(contactId);
  }

  listSlots(contactId: string, caseId?: string): Promise<unknown> {
    return this.appointmentsPort.listPortalAppointmentSlots(contactId, caseId);
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
  }): Promise<unknown> {
    const appointment = await this.appointmentsPort.bookPortalAppointmentSlot({
      slotId: input.slotId,
      contactId: input.contactId,
      portalUserId: input.portalUserId,
      caseId: input.caseId,
      title: input.title,
      description: input.description,
    });

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'appointment.slot.book',
      details: `Booked appointment slot ${input.slotId}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return appointment;
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
  }): Promise<unknown> {
    const appointment = await this.appointmentsPort.createPortalManualAppointmentRequest({
      contactId: input.contactId,
      portalUserId: input.portalUserId,
      caseId: input.caseId,
      title: input.title,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
    });

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'appointment.request',
      details: `Requested appointment ${appointment.id}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return appointment;
  }

  async cancel(input: {
    appointmentId: string;
    contactId: string;
    portalUserId: string;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<unknown | null> {
    const appointment = await this.appointmentsPort.cancelPortalAppointment({
      appointmentId: input.appointmentId,
      contactId: input.contactId,
    });

    if (appointment) {
      await logPortalActivity({
        portalUserId: input.portalUserId,
        action: 'appointment.cancel',
        details: `Cancelled appointment ${input.appointmentId}`,
        ipAddress: input.ipAddress,
        userAgent: normalizeUserAgent(input.userAgent),
      });
    }

    return appointment;
  }
}
