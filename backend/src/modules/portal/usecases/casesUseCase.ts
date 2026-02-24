import { PortalRepository } from '../repositories/portalRepository';

export class PortalCasesUseCase {
  constructor(private readonly repository: PortalRepository) {}

  listCases(contactId: string): Promise<unknown[]> {
    return this.repository.getPortalCases(contactId);
  }

  getCase(contactId: string, caseId: string): Promise<Record<string, unknown> | null> {
    return this.repository.getPortalCaseById(contactId, caseId);
  }

  getTimeline(contactId: string, caseId: string): Promise<unknown[]> {
    return this.repository.getPortalCaseTimeline(contactId, caseId);
  }

  getDocuments(contactId: string, caseId: string): Promise<unknown[]> {
    return this.repository.getPortalCaseDocuments(contactId, caseId);
  }

  getDownloadableDocument(
    contactId: string,
    caseId: string,
    documentId: string
  ): Promise<{ file_path: string; original_filename: string; mime_type: string } | null> {
    return this.repository.getPortalCaseDownloadableDocument(contactId, caseId, documentId);
  }
}

