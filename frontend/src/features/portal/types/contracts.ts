export interface PortalEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  location_name?: string;
  registration_id?: string | null;
  registration_status?: string | null;
}

export interface PortalApiClient {
  listEvents(): Promise<PortalEvent[]>;
  registerEvent(eventId: string): Promise<void>;
  cancelEventRegistration(eventId: string): Promise<void>;
}
