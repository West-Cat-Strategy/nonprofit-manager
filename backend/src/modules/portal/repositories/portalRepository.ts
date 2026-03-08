import { Pool } from 'pg';
import { PortalCaseRepository } from './caseRepository';
import { PortalProfileRepository } from './profileRepository';
import { PortalResourceRepository } from './resourceRepository';
import { PortalListOrder, PortalPagedResult, PortalRepositorySupport } from './shared';

export class PortalRepository {
  private readonly support = new PortalRepositorySupport();
  private readonly profile: PortalProfileRepository;
  private readonly cases: PortalCaseRepository;
  private readonly resources: PortalResourceRepository;

  constructor(pool: Pool) {
    this.profile = new PortalProfileRepository(pool, this.support);
    this.cases = new PortalCaseRepository(pool, this.support);
    this.resources = new PortalResourceRepository(pool, this.support);
  }

  getProfile(contactId: string): Promise<Record<string, unknown> | null> {
    return this.profile.getProfile(contactId);
  }

  updateProfile(
    contactId: string,
    updates: Record<string, string | null>
  ): Promise<Record<string, unknown> | null> {
    return this.profile.updateProfile(contactId, updates);
  }

  getPortalUserPasswordHash(portalUserId: string): Promise<string | null> {
    return this.profile.getPortalUserPasswordHash(portalUserId);
  }

  updatePortalUserPassword(portalUserId: string, passwordHash: string): Promise<void> {
    return this.profile.updatePortalUserPassword(portalUserId, passwordHash);
  }

  syncPortalUserEmail(portalUserId: string, email: string): Promise<void> {
    return this.profile.syncPortalUserEmail(portalUserId, email);
  }

  getPortalRelationships(contactId: string): Promise<unknown[]> {
    return this.profile.getPortalRelationships(contactId);
  }

  createRelatedContact(input: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<string> {
    return this.profile.createRelatedContact(input);
  }

  createPortalRelationship(input: {
    contactId: string;
    relatedContactId: string;
    relationshipType: string;
    relationshipLabel?: string | null;
    notes?: string | null;
  }): Promise<Record<string, unknown>> {
    return this.profile.createPortalRelationship(input);
  }

  updatePortalRelationship(input: {
    contactId: string;
    relationshipId: string;
    relationshipType?: string;
    relationshipLabel?: string | null;
    notes?: string | null;
  }): Promise<Record<string, unknown> | null> {
    return this.profile.updatePortalRelationship(input);
  }

  deletePortalRelationship(contactId: string, relationshipId: string): Promise<boolean> {
    return this.profile.deletePortalRelationship(contactId, relationshipId);
  }

  getPortalEvents(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'start_date' | 'name' | 'created_at';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    return this.resources.getPortalEvents(contactId, query);
  }

  getEventForPortalRegistration(eventId: string): Promise<Record<string, unknown> | null> {
    return this.resources.getEventForPortalRegistration(eventId);
  }

  getPortalRegistrationByEvent(eventId: string, contactId: string): Promise<string | null> {
    return this.resources.getPortalRegistrationByEvent(eventId, contactId);
  }

  getPortalCases(contactId: string): Promise<unknown[]> {
    return this.cases.getPortalCases(contactId);
  }

  getPortalCaseById(contactId: string, caseId: string): Promise<Record<string, unknown> | null> {
    return this.cases.getPortalCaseById(contactId, caseId);
  }

  getPortalCaseTimeline(
    contactId: string,
    caseId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ items: unknown[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> {
    return this.cases.getPortalCaseTimeline(contactId, caseId, options);
  }

  getPortalCaseDocuments(contactId: string, caseId: string): Promise<unknown[]> {
    return this.cases.getPortalCaseDocuments(contactId, caseId);
  }

  getPortalCaseDownloadableDocument(
    contactId: string,
    caseId: string,
    documentId: string
  ): Promise<{ file_path: string; original_filename: string; mime_type: string } | null> {
    return this.cases.getPortalCaseDownloadableDocument(contactId, caseId, documentId);
  }

  getPortalDocuments(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'created_at' | 'title' | 'document_type' | 'original_name';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    return this.resources.getPortalDocuments(contactId, query);
  }

  getPortalForms(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'created_at' | 'title' | 'document_type' | 'original_name';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    return this.resources.getPortalForms(contactId, query);
  }

  getPortalNotes(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'created_at' | 'subject' | 'note_type';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    return this.resources.getPortalNotes(contactId, query);
  }

  getPortalReminders(
    contactId: string,
    query?: {
      search?: string;
      sort?: 'date' | 'title' | 'type';
      order?: PortalListOrder;
      limit?: number;
      offset?: number;
    }
  ): Promise<PortalPagedResult<Record<string, unknown>>> {
    return this.resources.getPortalReminders(contactId, query);
  }

  getDownloadableDocument(
    contactId: string,
    documentId: string
  ): Promise<{ file_path: string; original_name: string; mime_type: string } | null> {
    return this.resources.getDownloadableDocument(contactId, documentId);
  }
}
