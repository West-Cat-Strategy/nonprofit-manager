import { CaseDocumentsRepository } from '@modules/cases/repositories/caseDocumentsRepository';
import { CaseDocumentsUseCase } from '@modules/cases/usecases/caseDocuments.usecase';
import { PortalRepository } from '../repositories/portalRepository';

export class PortalCasesUseCase {
  constructor(
    private readonly repository: PortalRepository,
    private readonly caseDocumentsUseCase = new CaseDocumentsUseCase(new CaseDocumentsRepository())
  ) {}

  listCases(contactId: string): Promise<unknown[]> {
    return this.repository.getPortalCases(contactId);
  }

  getCase(contactId: string, caseId: string): Promise<Record<string, unknown> | null> {
    return this.repository.getPortalCaseById(contactId, caseId);
  }

  getTimeline(
    contactId: string,
    caseId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ items: unknown[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> {
    return this.repository.getPortalCaseTimeline(contactId, caseId, options);
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

  async createDocument(input: {
    contactId: string;
    caseId: string;
    fileName: string;
    originalFilename: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    documentType?: string;
    documentName?: string;
    description?: string;
  }): Promise<unknown | null> {
    const caseRecord = await this.repository.getPortalCaseById(input.contactId, input.caseId);
    if (!caseRecord) {
      return null;
    }

    return this.caseDocumentsUseCase.create({
      caseId: input.caseId,
      fileName: input.fileName,
      originalFilename: input.originalFilename,
      filePath: input.filePath,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      documentType: input.documentType,
      documentName: input.documentName,
      description: input.description,
      visibleToClient: true,
    });
  }
}
