import type {
  CreateEventReminderAutomationDTO,
  SendEventRemindersDTO,
  SyncEventReminderAutomationsDTO,
  UpdateEventReminderAutomationDTO,
} from '@app-types/event';
import { EventRepository } from '../repositories/eventRepository';

export class EventRemindersUseCase {
  constructor(private readonly repository: EventRepository) {}

  send(eventId: string, data: SendEventRemindersDTO, sentBy: string | null): Promise<unknown> {
    return this.repository.sendEventReminders(eventId, data, {
      triggerType: 'manual',
      sentBy,
    });
  }

  listAutomations(eventId: string): Promise<unknown[]> {
    return this.repository.listReminderAutomations(eventId);
  }

  createAutomation(eventId: string, data: CreateEventReminderAutomationDTO, userId: string): Promise<unknown> {
    return this.repository.createReminderAutomation(eventId, data, userId);
  }

  updateAutomation(
    eventId: string,
    automationId: string,
    data: UpdateEventReminderAutomationDTO,
    userId: string
  ): Promise<unknown> {
    return this.repository.updateReminderAutomation(eventId, automationId, data, userId);
  }

  cancelAutomation(eventId: string, automationId: string, userId: string): Promise<unknown> {
    return this.repository.cancelReminderAutomation(eventId, automationId, userId);
  }

  syncAutomations(eventId: string, data: SyncEventReminderAutomationsDTO, userId: string): Promise<unknown[]> {
    return this.repository.syncReminderAutomations(eventId, data, userId);
  }
}
