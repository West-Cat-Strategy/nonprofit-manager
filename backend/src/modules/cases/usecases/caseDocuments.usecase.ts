import type { UpdateCaseDocumentDTO } from '@app-types/case';
import type { CaseDocumentsPort } from '../types/ports';

const normalizeText = (value: string | undefined | null): string | undefined | null => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export class CaseDocumentsUseCase {
  constructor(private readonly repository: CaseDocumentsPort) {}

  list(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseDocuments(caseId.trim());
  }

  get(caseId: string, documentId: string): Promise<unknown | null> {
    return this.repository.getCaseDocumentById(caseId.trim(), documentId.trim());
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
    const normalizedInput = {
      ...input,
      caseId: input.caseId.trim(),
      fileName: input.fileName.trim(),
      originalFilename: input.originalFilename.trim(),
      filePath: input.filePath.trim(),
      mimeType: input.mimeType.trim(),
      documentType: normalizeText(input.documentType) ?? undefined,
      documentName: normalizeText(input.documentName) ?? undefined,
      description: normalizeText(input.description) ?? undefined,
    };
    return this.repository.createCaseDocument(normalizedInput);
  }

  update(documentId: string, data: UpdateCaseDocumentDTO, userId?: string): Promise<unknown> {
    const normalizedData: UpdateCaseDocumentDTO = {
      ...data,
      document_name: normalizeText(data.document_name) ?? undefined,
      document_type: normalizeText(data.document_type),
      description: normalizeText(data.description),
    };
    return this.repository.updateCaseDocument(documentId.trim(), normalizedData, userId);
  }

  delete(documentId: string, userId?: string): Promise<boolean> {
    return this.repository.deleteCaseDocument(documentId.trim(), userId);
  }
}
