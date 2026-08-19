import { publishPortalAppointmentUpdated, publishPortalSlotUpdated } from '@services/portalRealtimeService';

type PortalActorType = 'staff' | 'portal';

type SlotDeliveryInput = {
  entityId: string;
  caseId: string | null;
  status: string;
  actorType: PortalActorType;
  source: string;
  contactId: string | null;
  organizationId: string | null;
};

type AppointmentDeliveryInput = {
  entityId: string;
  caseId: string | null;
  status: string;
  actorType: PortalActorType;
  source: string;
  contactId: string;
  organizationId: string | null;
};

export const publishSlotUpdated = (args: SlotDeliveryInput): void => {
  publishPortalSlotUpdated(args);
};

export const publishAppointmentUpdated = (args: AppointmentDeliveryInput): void => {
  publishPortalAppointmentUpdated(args);
};
