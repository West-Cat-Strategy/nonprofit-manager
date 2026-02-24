import type { UpdateCaseDocumentDTO } from '@app-types/case';
import type { CaseDocumentsPort } from '../types/ports';

export class CaseDocumentsUseCase {
  constructor(private readonly repository: CaseDocumentsPort) {}

  list(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseDocuments(caseId);
  }

  get(caseId: string, documentId: string): Promise<unknown | null> {
    return this.repository.getCaseDocumentById(caseId, documentId);
  }

  create(input: {
    caseId: string;
    fileName: string;
    originalFilename: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    documentType?: string;
    documentName?: string;
    description?: string;
    visibleToClient?: boolean;
    userId?: string;
  }): Promise<unknown> {
    return this.repository.createCaseDocument(input);
  }

  update(documentId: string, data: UpdateCaseDocumentDTO, userId?: string): Promise<unknown> {
    return this.repository.updateCaseDocument(documentId, data, userId);
  }

  delete(documentId: string, userId?: string): Promise<boolean> {
    return this.repository.deleteCaseDocument(documentId, userId);
  }
}

