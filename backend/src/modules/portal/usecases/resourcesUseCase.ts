import { PortalRepository } from '../repositories/portalRepository';

export class PortalResourcesUseCase {
  constructor(private readonly repository: PortalRepository) {}

  getDocuments(contactId: string): Promise<unknown[]> {
    return this.repository.getPortalDocuments(contactId);
  }

  getForms(contactId: string): Promise<unknown[]> {
    return this.repository.getPortalForms(contactId);
  }

  getNotes(contactId: string): Promise<unknown[]> {
    return this.repository.getPortalNotes(contactId);
  }

  async getReminders(contactId: string): Promise<unknown[]> {
    const [appointments, events] = await Promise.all([
      this.repository.getPortalReminderAppointments(contactId),
      this.repository.getPortalReminderEvents(contactId),
    ]);

    return [
      ...appointments.map((appointment) => ({
        type: 'appointment',
        id: (appointment as { id: string }).id,
        title: (appointment as { title: string }).title,
        date: (appointment as { start_time: string }).start_time,
      })),
      ...events.map((event) => ({
        type: 'event',
        id: (event as { id: string }).id,
        title: (event as { name: string }).name,
        date: (event as { start_date: string }).start_date,
      })),
    ];
  }

  getDownloadableDocument(contactId: string, documentId: string): Promise<{
    file_path: string;
    original_name: string;
    mime_type: string;
  } | null> {
    return this.repository.getDownloadableDocument(contactId, documentId);
  }
}
