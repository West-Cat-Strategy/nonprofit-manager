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
  limit?: number;
  offset?: number;
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

export interface PortalApiClient {
  listEvents(query?: PortalEventsQuery): Promise<PortalPagedResult<PortalEvent>>;
  registerEvent(eventId: string): Promise<void>;
  cancelEventRegistration(eventId: string): Promise<void>;
  listDocuments(query?: PortalDocumentsQuery): Promise<PortalPagedResult<PortalDocument>>;
  listForms(query?: PortalFormsQuery): Promise<PortalPagedResult<PortalDocument>>;
  listNotes(query?: PortalNotesQuery): Promise<PortalPagedResult<PortalNote>>;
  listReminders(query?: PortalRemindersQuery): Promise<PortalPagedResult<PortalReminder>>;
  listCases(): Promise<PortalCaseSummary[]>;
  getCase(caseId: string): Promise<PortalCaseDetail>;
  getCaseTimeline(caseId: string, query?: PortalCaseTimelineQuery): Promise<PortalCaseTimelinePage>;
  listCaseDocuments(caseId: string): Promise<PortalCaseDocument[]>;
  getCaseDocumentDownloadUrl(caseId: string, documentId: string, disposition?: 'inline' | 'attachment'): string;
  getDocumentDownloadUrl(documentId: string, disposition?: 'inline' | 'attachment'): string;
}
