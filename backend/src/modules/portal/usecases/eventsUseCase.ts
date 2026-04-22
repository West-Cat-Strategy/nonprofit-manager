import { RegistrationStatus } from '@app-types/event';
import eventService, { EventService } from '@modules/events/services/eventService';
import { logPortalActivity } from '@services/domains/integration';
import { PortalRepository } from '../repositories/portalRepository';

interface PortalRegistrationEventRow {
  created_by?: string | null;
  is_public: boolean;
  status: string;
  start_date: string | Date;
}

const normalizeUserAgent = (userAgent?: string | string[]): string | null =>
  typeof userAgent === 'string' ? userAgent : null;

export class PortalEventsUseCase {
  private readonly service: EventService;

  constructor(private readonly repository: PortalRepository) {
    this.service = eventService;
  }

  listEvents(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'start_date' | 'name' | 'created_at';
      order?: 'asc' | 'desc';
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    items: unknown[];
    page: { limit: number; offset: number; has_more: boolean; total: number };
  }> {
    return this.repository.getPortalEvents(contactId, query);
  }

  async register(input: {
    contactId: string;
    eventId: string;
    portalUserId: string;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<'not_found' | 'not_public' | 'started' | 'inactive' | 'created' | 'exists' | 'full'> {
    const event = (await this.repository.getEventForPortalRegistration(
      input.eventId
    )) as PortalRegistrationEventRow | null;
    if (!event) {
      return 'not_found';
    }

    if (!event.is_public) {
      return 'not_public';
    }

    if (new Date(event.start_date as string).getTime() < Date.now()) {
      return 'started';
    }

    if (event.status === 'cancelled' || event.status === 'completed') {
      return 'inactive';
    }

    try {
      await this.service.registerContact(
        {
          event_id: input.eventId,
          contact_id: input.contactId,
          registration_status: RegistrationStatus.REGISTERED,
        },
        {
          actorUserId: event.created_by ?? null,
          source: 'portal',
        }
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'Contact is already registered for this event' ||
          error.message === 'Contact is already registered for this occurrence' ||
          error.message === 'Contact is already registered for this event series')
      ) {
        return 'exists';
      }
      if (error instanceof Error && error.message === 'Event is at full capacity') {
        return 'full';
      }
      throw error;
    }

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'event.register',
      details: `Registered for event ${input.eventId}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return 'created';
  }

  async cancelRegistration(input: {
    contactId: string;
    eventId: string;
    portalUserId: string;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<'not_found' | 'cancelled'> {
    const event = (await this.repository.getEventForPortalRegistration(
      input.eventId
    )) as PortalRegistrationEventRow | null;
    const registrationId = await this.repository.getPortalRegistrationByEvent(input.eventId, input.contactId);
    if (!registrationId) {
      return 'not_found';
    }

    await this.service.cancelRegistration(registrationId, {
      actorUserId: event?.created_by ?? null,
      source: 'portal',
    });

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'event.cancel',
      details: `Cancelled registration for event ${input.eventId}`,
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return 'cancelled';
  }
}
