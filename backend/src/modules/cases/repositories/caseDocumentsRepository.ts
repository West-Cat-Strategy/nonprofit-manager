import { services } from '@container/services';
import type { UpdateCaseDocumentDTO } from '@app-types/case';
import type { CaseDocumentsPort } from '../types/ports';

export class CaseDocumentsRepository implements CaseDocumentsPort {
  async getCaseDocuments(caseId: string): Promise<unknown[]> {
    return services.case.getCaseDocuments(caseId);
  }

  async getCaseDocumentById(caseId: string, documentId: string): Promise<unknown | null> {
    return services.case.getCaseDocumentById(caseId, documentId);
  }

  async createCaseDocument(input: {
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
    return services.case.createCaseDocument(input);
  }

  async updateCaseDocument(documentId: string, data: UpdateCaseDocumentDTO, userId?: string): Promise<unknown> {
    return services.case.updateCaseDocument(documentId, data, userId);
  }

  async deleteCaseDocument(documentId: string, userId?: string): Promise<boolean> {
    return services.case.deleteCaseDocument(documentId, userId);
  }
}

