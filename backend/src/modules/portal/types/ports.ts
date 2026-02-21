export interface PortalMessagingPort {
  listPortalThreads(portalUserId: string): Promise<unknown[]>;
  createThreadWithMessage(input: {
    portalUserId: string;
    contactId: string;
    caseId: string | null;
    subject: string | null;
    messageText: string;
  }): Promise<{ thread: { id: string } } & object>;
  getPortalThread(portalUserId: string, threadId: string): Promise<unknown | null>;
  addPortalMessage(input: {
    portalUserId: string;
    threadId: string;
    messageText: string;
  }): Promise<unknown>;
  markPortalThreadRead(portalUserId: string, threadId: string): Promise<number>;
  updateThread(input: {
    threadId: string;
    status?: 'open' | 'closed' | 'archived';
    subject?: string | null;
    closedBy: string | null;
  }): Promise<unknown | null>;
}

export interface PortalAppointmentsPort {
  listPortalAppointments(contactId: string): Promise<unknown[]>;
  listPortalAppointmentSlots(contactId: string, caseId?: string): Promise<unknown>;
  bookPortalAppointmentSlot(input: {
    slotId: string;
    contactId: string;
    portalUserId: string;
    caseId: string | null;
    title: string | null;
    description: string | null;
  }): Promise<unknown>;
  createPortalManualAppointmentRequest(input: {
    contactId: string;
    portalUserId: string;
    caseId?: string | null;
    title: string;
    description?: string | null;
    startTime: string;
    endTime?: string | null;
    location?: string | null;
  }): Promise<{ id: string } & object>;
  cancelPortalAppointment(input: {
    appointmentId: string;
    contactId: string;
  }): Promise<unknown | null>;
}
