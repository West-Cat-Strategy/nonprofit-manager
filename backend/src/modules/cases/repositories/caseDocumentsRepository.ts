import pool from '@config/database';
import type { UpdateCaseDocumentDTO } from '@app-types/case';
import type { CaseDocumentsPort } from '../types/ports';
import {
  createCaseDocumentQuery,
  deleteCaseDocumentQuery,
  getCaseDocumentByIdQuery,
  getCaseDocumentsQuery,
  updateCaseDocumentQuery,
} from '../queries/documentsQueries';

export class CaseDocumentsRepository implements CaseDocumentsPort {
  async getCaseDocuments(caseId: string, organizationId?: string): Promise<unknown[]> {
    return getCaseDocumentsQuery(pool, caseId, organizationId);
  }

  async getCaseDocumentById(
    caseId: string,
    documentId: string,
    organizationId?: string
  ): Promise<unknown | null> {
    return getCaseDocumentByIdQuery(pool, caseId, documentId, organizationId);
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
    organizationId?: string;
  }): Promise<unknown> {
    return createCaseDocumentQuery(pool, input);
  }

  async updateCaseDocument(
    documentId: string,
    data: UpdateCaseDocumentDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return updateCaseDocumentQuery(pool, documentId, data, userId, organizationId);
  }

  async deleteCaseDocument(
    documentId: string,
    userId?: string,
    organizationId?: string
  ): Promise<boolean> {
    return deleteCaseDocumentQuery(pool, documentId, userId, organizationId);
  }
}
