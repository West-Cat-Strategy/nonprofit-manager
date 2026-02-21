import type {
  ContactDocument,
  CreateContactDocumentDTO,
  UpdateContactDocumentDTO,
} from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { ContactDocumentsPort } from '../types/ports';

export class ContactDocumentsUseCase {
  constructor(private readonly repository: ContactDocumentsPort) {}

  list(contactId: string): Promise<ContactDocument[]> {
    return this.repository.list(contactId);
  }

  getById(documentId: string, scope?: DataScopeFilter): Promise<ContactDocument | null> {
    if (scope) {
      return this.repository.getByIdWithScope(documentId, scope);
    }

    return this.repository.getById(documentId);
  }

  create(
    contactId: string,
    file: Express.Multer.File,
    payload: CreateContactDocumentDTO,
    userId: string
  ): Promise<ContactDocument> {
    return this.repository.create(contactId, file, payload, userId);
  }

  update(
    documentId: string,
    payload: UpdateContactDocumentDTO,
    userId?: string,
    scope?: DataScopeFilter
  ): Promise<ContactDocument | null> {
    if (scope) {
      return this.repository
        .getByIdWithScope(documentId, scope)
        .then((doc) => (doc ? this.repository.update(documentId, payload, userId) : null));
    }

    return this.repository.update(documentId, payload, userId);
  }

  delete(documentId: string, scope?: DataScopeFilter): Promise<boolean> {
    if (scope) {
      return this.repository
        .getByIdWithScope(documentId, scope)
        .then((doc) => (doc ? this.repository.delete(documentId) : false));
    }

    return this.repository.delete(documentId);
  }

  resolveFilePath(document: ContactDocument): Promise<string | null> {
    return this.repository.resolveFilePath(document);
  }
}
