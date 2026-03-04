import { PortalRepository } from '../repositories/portalRepository';

type PortalOffsetPage = {
  limit: number;
  offset: number;
  has_more: boolean;
  total: number;
};

type PortalPagedResult = {
  items: unknown[];
  page: PortalOffsetPage;
};

export class PortalResourcesUseCase {
  constructor(private readonly repository: PortalRepository) {}

  getDocuments(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'created_at' | 'title' | 'document_type' | 'original_name';
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult> {
    return this.repository.getPortalDocuments(contactId, query);
  }

  getForms(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'created_at' | 'title' | 'document_type' | 'original_name';
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult> {
    return this.repository.getPortalForms(contactId, query);
  }

  getNotes(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'created_at' | 'subject' | 'note_type';
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult> {
    return this.repository.getPortalNotes(contactId, query);
  }

  getReminders(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'date' | 'title' | 'type';
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult> {
    return this.repository.getPortalReminders(contactId, query);
  }

  getDownloadableDocument(contactId: string, documentId: string): Promise<{
    file_path: string;
    original_name: string;
    mime_type: string;
  } | null> {
    return this.repository.getDownloadableDocument(contactId, documentId);
  }
}
