/**
 * Contact Document Service
 * Handles CRUD operations for contact documents
 */
import type { ContactDocument, CreateContactDocumentDTO, UpdateContactDocumentDTO } from '../types/contact';
import type { DataScopeFilter } from '../types/dataScope';
/**
 * Get all documents for a contact
 */
export declare function getDocumentsByContact(contactId: string): Promise<ContactDocument[]>;
/**
 * Get documents by case ID
 */
export declare function getDocumentsByCase(caseId: string): Promise<ContactDocument[]>;
/**
 * Get a single document by ID
 */
export declare function getDocumentById(documentId: string): Promise<ContactDocument | null>;
/**
 * Get a single document by ID with data scope filtering
 */
export declare function getDocumentByIdWithScope(documentId: string, scope?: DataScopeFilter): Promise<ContactDocument | null>;
/**
 * Create a new document record and upload file
 */
export declare function createDocument(contactId: string, file: Express.Multer.File, data: CreateContactDocumentDTO, userId: string): Promise<ContactDocument>;
/**
 * Update document metadata
 */
export declare function updateDocument(documentId: string, data: UpdateContactDocumentDTO): Promise<ContactDocument | null>;
/**
 * Soft delete a document (also removes file from storage)
 */
export declare function deleteDocument(documentId: string): Promise<boolean>;
/**
 * Hard delete a document (permanent removal)
 */
export declare function hardDeleteDocument(documentId: string): Promise<boolean>;
/**
 * Get full file path for download
 */
export declare function getDocumentFilePath(document: ContactDocument): string | null;
/**
 * Get document count for a contact
 */
export declare function getDocumentCount(contactId: string): Promise<number>;
//# sourceMappingURL=contactDocumentService.d.ts.map