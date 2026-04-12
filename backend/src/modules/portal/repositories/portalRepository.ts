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
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
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

  async getDashboard(contactId: string, portalUserId: string): Promise<Record<string, unknown>> {
    const [
      activeCases,
      unreadThreadsCountResult,
      recentThreadsResult,
      nextAppointmentResult,
      recentActivityResult,
    ] = await Promise.all([
      this.cases.getPortalCases(contactId),
      this.pool.query<{ unread_threads_count: string }>(
        `SELECT COUNT(*)::text AS unread_threads_count
           FROM portal_threads t
           WHERE t.portal_user_id = $1
             AND EXISTS (
               SELECT 1
               FROM portal_messages pm
               WHERE pm.thread_id = t.id
                 AND pm.sender_type IN ('staff', 'system')
                 AND pm.is_internal = false
                 AND pm.read_by_portal_at IS NULL
             )`,
        [portalUserId]
      ),
      this.pool.query<Record<string, unknown>>(
        `SELECT
             t.id,
             t.subject,
             t.status,
             t.last_message_at,
             t.last_message_preview,
             c.case_number,
             c.title AS case_title,
             u.first_name AS pointperson_first_name,
             u.last_name AS pointperson_last_name,
             COALESCE(unread.unread_count, 0) AS unread_count
           FROM portal_threads t
           LEFT JOIN cases c ON c.id = t.case_id
           LEFT JOIN users u ON u.id = t.pointperson_user_id
           LEFT JOIN LATERAL (
             SELECT COUNT(*)::int AS unread_count
             FROM portal_messages pm
             WHERE pm.thread_id = t.id
               AND pm.sender_type IN ('staff', 'system')
               AND pm.is_internal = false
               AND pm.read_by_portal_at IS NULL
           ) unread ON true
           WHERE t.portal_user_id = $1
           ORDER BY t.last_message_at DESC
           LIMIT 3`,
        [portalUserId]
      ),
      this.pool.query<Record<string, unknown>>(
        `SELECT
             a.id,
             a.title,
             a.description,
             a.start_time,
             a.end_time,
             a.status,
             a.location,
             a.request_type,
             c.case_number,
             c.title AS case_title
           FROM appointments a
           LEFT JOIN cases c ON c.id = a.case_id
           WHERE a.contact_id = $1
             AND a.status IN ('requested', 'confirmed')
             AND a.start_time >= NOW()
           ORDER BY a.start_time ASC
           LIMIT 1`,
        [contactId]
      ),
      this.pool.query<Record<string, unknown>>(
        `SELECT
             timeline.id,
             timeline.type,
             timeline.created_at,
             timeline.title,
             timeline.content,
             timeline.metadata,
             c.case_number,
             c.title AS case_title
           FROM (
             SELECT
               cn.id,
               'note'::text AS type,
               cn.created_at,
               COALESCE(cn.subject, cn.note_type, 'Note') AS title,
               cn.content,
               jsonb_build_object('note_type', cn.note_type) AS metadata,
               cn.case_id
             FROM case_notes cn
             JOIN cases c ON c.id = cn.case_id
             WHERE c.contact_id = $1
               AND c.client_viewable = true
               AND cn.visible_to_client = true

             UNION ALL

             SELECT
               cd.id,
               'document'::text AS type,
               COALESCE(cd.created_at, cd.uploaded_at) AS created_at,
               COALESCE(cd.document_name, cd.original_filename, 'Document') AS title,
               cd.description AS content,
               jsonb_build_object('document_type', cd.document_type) AS metadata,
               cd.case_id
             FROM case_documents cd
             JOIN cases c ON c.id = cd.case_id
             WHERE c.contact_id = $1
               AND c.client_viewable = true
               AND cd.visible_to_client = true
               AND COALESCE(cd.is_active, true) = true

             UNION ALL

             SELECT
               a.id,
               'appointment'::text AS type,
               a.created_at,
               COALESCE(a.title, 'Appointment') AS title,
               a.description AS content,
               jsonb_build_object('status', a.status, 'start_time', a.start_time) AS metadata,
               a.case_id
             FROM appointments a
             WHERE a.contact_id = $1
               AND a.status != 'cancelled'
           ) timeline
           LEFT JOIN cases c ON c.id = timeline.case_id
           ORDER BY timeline.created_at DESC
           LIMIT 5`,
        [contactId]
      ),
    ]);

    const [upcomingEvents, recentDocuments, reminders] = await Promise.all([
      this.resources.getPortalEvents(contactId, {
        limit: 3,
        offset: 0,
        sort: 'start_date',
        order: 'asc',
      }),
      this.resources.getPortalDocuments(contactId, {
        limit: 3,
        offset: 0,
        sort: 'created_at',
        order: 'desc',
      }),
      this.resources.getPortalReminders(contactId, {
        limit: 5,
        offset: 0,
        sort: 'date',
        order: 'asc',
      }),
    ]);

    return {
      active_cases: activeCases.slice(0, 4),
      unread_threads_count: Number(unreadThreadsCountResult.rows[0]?.unread_threads_count ?? '0'),
      recent_threads: recentThreadsResult.rows,
      next_appointment: (nextAppointmentResult.rows[0] as Record<string, unknown> | undefined) ?? null,
      upcoming_events: upcomingEvents.items,
      recent_documents: recentDocuments.items,
      reminders: reminders.items,
      recent_activity: recentActivityResult.rows,
    };
  }
}
