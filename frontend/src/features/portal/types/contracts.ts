import type { PortalCaseProvenance } from '../../../types/case';

export interface PortalEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  location_name?: string;
  event_type?: string;
  registration_id?: string | null;
  registration_status?: string | null;
  check_in_token?: string | null;
  checked_in?: boolean | null;
  check_in_time?: string | null;
  check_in_method?: 'manual' | 'qr' | null;
}

export type PortalSortOrder = 'asc' | 'desc';

export interface PortalOffsetPage {
  limit: number;
  offset: number;
  has_more: boolean;
  total: number;
}

export interface PortalPagedResult<T> {
  items: T[];
  page: PortalOffsetPage;
}

export interface PortalEventsQuery {
  search?: string;
  sort?: 'start_date' | 'name' | 'created_at';
  order?: PortalSortOrder;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface PortalAppointmentQuery {
  status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  case_id?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface PortalAppointmentSlot {
  id: string;
  title: string | null;
  details: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  available_count: number;
  status: 'open' | 'closed' | 'cancelled';
  case_number?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
}

export interface PortalAppointmentSlotsPayload {
  selected_case_id: string | null;
  selected_pointperson_user_id: string | null;
  slots: PortalAppointmentSlot[];
}

export interface PortalAppointmentRequestInput {
  case_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
}

export interface PortalAppointmentSlotBookingInput {
  case_id?: string;
  title?: string | null;
  description?: string | null;
}

export interface PortalDocument {
  id: string;
  original_name: string;
  document_type: string;
  title?: string | null;
  description?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  created_at: string;
}

export interface PortalDocumentsQuery {
  search?: string;
  sort?: 'created_at' | 'title' | 'document_type' | 'original_name';
  order?: PortalSortOrder;
  limit?: number;
  offset?: number;
}

export interface PortalFormsQuery {
  search?: string;
  sort?: 'created_at' | 'title' | 'document_type' | 'original_name';
  order?: PortalSortOrder;
  limit?: number;
  offset?: number;
}

export interface PortalNote {
  id: string;
  note_type: string;
  subject?: string | null;
  content: string;
  created_at: string;
}

export interface PortalNotesQuery {
  search?: string;
  sort?: 'created_at' | 'subject' | 'note_type';
  order?: PortalSortOrder;
  limit?: number;
  offset?: number;
}

export interface PortalReminder {
  type: 'appointment' | 'event';
  id: string;
  title: string;
  date: string;
}

export interface PortalThreadSummary {
  id: string;
  subject: string | null;
  status: 'open' | 'closed' | 'archived';
  case_number: string | null;
  case_title: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  unread_count: number;
  last_message_at: string;
  last_message_preview: string | null;
}

export interface PortalAppointmentSummary {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  status: string;
  location?: string | null;
  case_number?: string | null;
  case_title?: string | null;
  request_type?: 'manual_request' | 'slot_booking';
}

export interface PortalRemindersQuery {
  search?: string;
  sort?: 'date' | 'title' | 'type';
  order?: PortalSortOrder;
  limit?: number;
  offset?: number;
}

export interface PortalCaseSummary {
  id: string;
  case_number: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  status_name?: string | null;
  status_type?: string | null;
  case_type_name?: string | null;
  updated_at: string;
  provenance?: PortalCaseProvenance | null;
}

export interface PortalCaseDetail extends PortalCaseSummary {
  intake_date?: string | null;
  opened_date?: string | null;
  closed_date?: string | null;
  due_date?: string | null;
}

export interface PortalCaseTimelineEvent {
  id: string;
  type: 'note' | 'outcome' | 'document';
  created_at: string;
  title: string;
  content?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PortalCaseTimelinePage {
  items: PortalCaseTimelineEvent[];
  page: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

export interface PortalCaseTimelineQuery {
  limit?: number;
  cursor?: string;
}

export interface PortalCaseDocument {
  id: string;
  document_name?: string | null;
  original_filename: string;
  document_type?: string | null;
  description?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  created_at: string;
}

export interface PortalDashboardData {
  active_cases: PortalCaseSummary[];
  unread_threads_count: number;
  recent_threads: PortalThreadSummary[];
  next_appointment: PortalAppointmentSummary | null;
  upcoming_events: PortalEvent[];
  recent_documents: PortalDocument[];
  reminders: PortalReminder[];
}

export interface PortalPointpersonCaseContext {
  case_id: string;
  case_number: string;
  case_title: string;
  assigned_to: string | null;
  pointperson_first_name: string | null;
  pointperson_last_name: string | null;
  is_messageable: boolean;
  is_default: boolean;
}

export interface PortalPointpersonContext {
  default_case_id: string | null;
  default_pointperson_user_id: string | null;
  selected_case_id?: string | null;
  selected_pointperson_user_id?: string | null;
  cases: PortalPointpersonCaseContext[];
}

export interface PortalApiClient {
  getDashboard(): Promise<PortalDashboardData>;
  listEvents(query?: PortalEventsQuery): Promise<PortalPagedResult<PortalEvent>>;
  listEventsAll(query?: PortalEventsQuery): Promise<PortalEvent[]>;
  registerEvent(eventId: string): Promise<void>;
  cancelEventRegistration(eventId: string): Promise<void>;
  listAppointments(query?: PortalAppointmentQuery): Promise<PortalAppointmentSummary[]>;
  listAppointmentsAll(query?: PortalAppointmentQuery): Promise<PortalAppointmentSummary[]>;
  listAppointmentSlots(query?: {
    case_id?: string;
    from?: string;
    to?: string;
  }): Promise<PortalAppointmentSlotsPayload>;
  requestAppointment(payload: PortalAppointmentRequestInput): Promise<void>;
  bookAppointmentSlot(slotId: string, payload: PortalAppointmentSlotBookingInput): Promise<void>;
  cancelAppointment(appointmentId: string): Promise<void>;
  listDocuments(query?: PortalDocumentsQuery): Promise<PortalPagedResult<PortalDocument>>;
  listForms(query?: PortalFormsQuery): Promise<PortalPagedResult<PortalDocument>>;
  listNotes(query?: PortalNotesQuery): Promise<PortalPagedResult<PortalNote>>;
  listReminders(query?: PortalRemindersQuery): Promise<PortalPagedResult<PortalReminder>>;
  listCases(): Promise<PortalCaseSummary[]>;
  getCase(caseId: string): Promise<PortalCaseDetail>;
  getCaseTimeline(caseId: string, query?: PortalCaseTimelineQuery): Promise<PortalCaseTimelinePage>;
  listCaseDocuments(caseId: string): Promise<PortalCaseDocument[]>;
  uploadCaseDocument(caseId: string, formData: FormData): Promise<PortalCaseDocument>;
  getCaseDocumentDownloadUrl(caseId: string, documentId: string, disposition?: 'inline' | 'attachment'): string;
  getDocumentDownloadUrl(documentId: string, disposition?: 'inline' | 'attachment'): string;
}
