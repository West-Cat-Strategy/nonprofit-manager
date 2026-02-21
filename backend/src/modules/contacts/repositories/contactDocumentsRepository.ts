import * as contactDocumentService from '@services/contactDocumentService';
import type {
  ContactDocument,
  CreateContactDocumentDTO,
  UpdateContactDocumentDTO,
} from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { ContactDocumentsPort } from '../types/ports';

export class ContactDocumentsRepository implements ContactDocumentsPort {
  async list(contactId: string): Promise<ContactDocument[]> {
    return contactDocumentService.getDocumentsByContact(contactId);
  }

  async getById(documentId: string): Promise<ContactDocument | null> {
    return contactDocumentService.getDocumentById(documentId);
  }

  async getByIdWithScope(documentId: string, scope: DataScopeFilter): Promise<ContactDocument | null> {
    return contactDocumentService.getDocumentByIdWithScope(documentId, scope);
  }

  async create(
    contactId: string,
    file: Express.Multer.File,
    payload: CreateContactDocumentDTO,
    userId: string
  ): Promise<ContactDocument> {
    return contactDocumentService.createDocument(contactId, file, payload, userId);
  }

  async update(
    documentId: string,
    payload: UpdateContactDocumentDTO,
    userId?: string
  ): Promise<ContactDocument | null> {
    return contactDocumentService.updateDocument(documentId, payload, userId);
  }

  async delete(documentId: string): Promise<boolean> {
    return contactDocumentService.deleteDocument(documentId);
  }

  resolveFilePath(document: ContactDocument): string | null {
    return contactDocumentService.getDocumentFilePath(document);
  }
}
