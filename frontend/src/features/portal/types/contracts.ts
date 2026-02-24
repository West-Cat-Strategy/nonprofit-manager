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
  listEvents(): Promise<PortalEvent[]>;
  registerEvent(eventId: string): Promise<void>;
  cancelEventRegistration(eventId: string): Promise<void>;
  listCases(): Promise<PortalCaseSummary[]>;
  getCase(caseId: string): Promise<PortalCaseDetail>;
  getCaseTimeline(caseId: string): Promise<PortalCaseTimelineEvent[]>;
  listCaseDocuments(caseId: string): Promise<PortalCaseDocument[]>;
  getCaseDocumentDownloadUrl(caseId: string, documentId: string, disposition?: 'inline' | 'attachment'): string;
}
