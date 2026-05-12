import { Pool } from 'pg';
import { PortalCaseRepository } from './caseRepository';
import { PortalProfileRepository } from './profileRepository';
import { PortalResourceRepository } from './resourceRepository';
import { PortalListOrder, PortalPagedResult, PortalRepositorySupport } from './shared';

export type PortalDashboardActionKind = 'form' | 'message' | 'appointment' | 'case' | 'document';
export type PortalDashboardActionPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface PortalDashboardActionItem {
  id: string;
  kind: PortalDashboardActionKind;
  priority: PortalDashboardActionPriority;
  title: string;
  description: string;
  href: string;
  case_id?: string | null;
  due_at?: string | Date | null;
  status?: string | null;
  created_at?: string | Date | null;
}

const ACTIVE_FORM_STATUSES = ['draft', 'sent', 'viewed', 'in_progress', 'submitted', 'revision_requested'];

const actionPriorityRank: Record<PortalDashboardActionPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const toTime = (value?: string | Date | null): number => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

const toIsoOrNull = (value?: string | Date | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const getFormActionPriority = (status?: string | null, dueAt?: string | Date | null): PortalDashboardActionPriority => {
  const dueTime = toTime(dueAt);
  const now = Date.now();
  const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

  if (status === 'revision_requested' || dueTime < now) {
    return 'urgent';
  }
  if (dueTime <= sevenDaysFromNow || status === 'submitted') {
    return 'high';
  }
  return 'normal';
};

const formatCaseContext = (caseNumber?: unknown, caseTitle?: unknown): string | null => {
  const parts = [caseNumber, caseTitle]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
  return parts.length > 0 ? parts.join(' - ') : null;
};

export const buildPortalDashboardActionItems = (input: {
  activeForms?: Array<Record<string, unknown>>;
  unreadThreadsCount?: number;
  recentThreads?: Array<Record<string, unknown>>;
  nextAppointment?: Record<string, unknown> | null;
  activeCases?: Array<Record<string, unknown>>;
  recentDocuments?: Array<Record<string, unknown>>;
  recentActivity?: Array<Record<string, unknown>>;
}): PortalDashboardActionItem[] => {
  const actionItems: PortalDashboardActionItem[] = [];

  for (const form of input.activeForms ?? []) {
    const id = String(form.id);
    const status = typeof form.status === 'string' ? form.status : null;
    const dueAt = (form.due_at as string | Date | null | undefined) ?? null;
    const caseContext = formatCaseContext(form.case_number, form.case_title);
    const needsRevision = status === 'revision_requested';
    const submitted = status === 'submitted';

    actionItems.push({
      id: `form:${id}`,
      kind: 'form',
      priority: getFormActionPriority(status, dueAt),
      title: needsRevision
        ? `Update ${String(form.title || 'assigned form')}`
        : submitted
          ? `Review submitted ${String(form.title || 'form')}`
          : `Complete ${String(form.title || 'assigned form')}`,
      description: needsRevision
        ? String(form.revision_notes || 'Staff requested changes before review can continue.')
        : submitted
          ? 'Staff are reviewing this form. You can still make changes until review is complete.'
          : caseContext || 'A form is waiting in your portal.',
      href: `/portal/forms?assignment=${encodeURIComponent(id)}`,
      case_id: (form.case_id as string | null | undefined) ?? null,
      due_at: toIsoOrNull(dueAt),
      status,
      created_at: toIsoOrNull((form.updated_at as string | Date | null | undefined) ?? null),
    });
  }

  const unreadThreads = input.recentThreads?.filter((thread) => Number(thread.unread_count ?? 0) > 0) ?? [];
  const unreadCount = input.unreadThreadsCount ?? unreadThreads.reduce((total, thread) => total + Number(thread.unread_count ?? 0), 0);
  if (unreadCount > 0) {
    const latestUnread = unreadThreads[0] ?? input.recentThreads?.[0] ?? null;
    actionItems.push({
      id: 'message:unread',
      kind: 'message',
      priority: 'high',
      title: unreadCount === 1 ? 'Read 1 new message' : `Read ${unreadCount} new messages`,
      description: latestUnread?.last_message_preview
        ? String(latestUnread.last_message_preview)
        : 'Staff sent an update in your portal messages.',
      href: latestUnread?.id
        ? `/portal/messages?thread=${encodeURIComponent(String(latestUnread.id))}${
            latestUnread.case_id ? `&case=${encodeURIComponent(String(latestUnread.case_id))}` : ''
          }`
        : '/portal/messages',
      case_id: (latestUnread?.case_id as string | null | undefined) ?? null,
      status: (latestUnread?.status as string | null | undefined) ?? 'open',
      created_at: toIsoOrNull((latestUnread?.last_message_at as string | Date | null | undefined) ?? null),
    });
  }

  if (input.nextAppointment) {
    actionItems.push({
      id: `appointment:${String(input.nextAppointment.id)}`,
      kind: 'appointment',
      priority: input.nextAppointment.status === 'requested' ? 'normal' : 'low',
      title: input.nextAppointment.status === 'requested' ? 'Track appointment request' : 'Next appointment',
      description: formatCaseContext(input.nextAppointment.case_number, input.nextAppointment.case_title) ||
        String(input.nextAppointment.title || 'Review your appointment details.'),
      href: `/portal/appointments?appointment=${encodeURIComponent(String(input.nextAppointment.id))}${
        input.nextAppointment.case_id ? `&case=${encodeURIComponent(String(input.nextAppointment.case_id))}` : ''
      }`,
      case_id: (input.nextAppointment.case_id as string | null | undefined) ?? null,
      due_at: toIsoOrNull((input.nextAppointment.start_time as string | Date | null | undefined) ?? null),
      status: (input.nextAppointment.status as string | null | undefined) ?? null,
      created_at: toIsoOrNull((input.nextAppointment.start_time as string | Date | null | undefined) ?? null),
    });
  }

  const firstDocument = input.recentDocuments?.[0];
  if (firstDocument) {
    actionItems.push({
      id: `document:${String(firstDocument.id)}`,
      kind: 'document',
      priority: 'low',
      title: `Review ${String(firstDocument.title || firstDocument.original_name || 'recent document')}`,
      description: 'Staff shared a document in your portal.',
      href: '/portal/documents',
      status: (firstDocument.document_type as string | null | undefined) ?? null,
      created_at: toIsoOrNull((firstDocument.created_at as string | Date | null | undefined) ?? null),
    });
  }

  const firstActivity = input.recentActivity?.[0];
  const firstCase = input.activeCases?.[0];
  if (firstCase && firstActivity) {
    actionItems.push({
      id: `case:${String(firstCase.id)}`,
      kind: 'case',
      priority: 'low',
      title: `Check ${String(firstCase.title || 'shared case')}`,
      description: String(firstActivity.title || 'There is recent activity on a shared case.'),
      href: `/portal/cases/${encodeURIComponent(String(firstCase.id))}`,
      case_id: (firstCase.id as string | null | undefined) ?? null,
      status: (firstCase.status_name as string | null | undefined) ?? null,
      created_at: toIsoOrNull((firstActivity.created_at as string | Date | null | undefined) ?? null),
    });
  }

  return actionItems
    .sort((left, right) => {
      const priorityDelta = actionPriorityRank[left.priority] - actionPriorityRank[right.priority];
      if (priorityDelta !== 0) return priorityDelta;
      return toTime(left.due_at ?? left.created_at) - toTime(right.due_at ?? right.created_at);
    })
    .slice(0, 6);
};

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
      activeFormsResult,
      unreadThreadsCountResult,
      recentThreadsResult,
      nextAppointmentResult,
      recentActivityResult,
    ] = await Promise.all([
      this.cases.getPortalCases(contactId),
      this.pool.query<Record<string, unknown>>(
        `SELECT
             cfa.id,
             cfa.case_id,
             cfa.title,
             cfa.description,
             cfa.status,
             cfa.due_at,
             cfa.sent_at,
             cfa.submitted_at,
             cfa.revision_requested_at,
             cfa.revision_notes,
             cfa.updated_at,
             c.case_number,
             c.title AS case_title
           FROM case_form_assignments cfa
           LEFT JOIN cases c ON c.id = cfa.case_id
           WHERE cfa.contact_id = $1
             AND (
               cfa.delivery_target IN ('portal', 'portal_and_email')
               OR cfa.delivery_channels @> ARRAY['portal']::text[]
             )
             AND cfa.status = ANY($2::text[])
           ORDER BY
             CASE
               WHEN cfa.status = 'revision_requested' THEN 0
               WHEN cfa.due_at IS NOT NULL AND cfa.due_at < NOW() THEN 1
               WHEN cfa.due_at IS NOT NULL THEN 2
               WHEN cfa.status = 'submitted' THEN 3
               ELSE 4
             END,
             COALESCE(cfa.due_at, cfa.submitted_at, cfa.sent_at, cfa.updated_at) ASC
           LIMIT 6`,
        [contactId, ACTIVE_FORM_STATUSES]
      ),
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
             t.case_id,
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
             a.case_id,
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
      action_items: buildPortalDashboardActionItems({
        activeForms: activeFormsResult.rows,
        unreadThreadsCount: Number(unreadThreadsCountResult.rows[0]?.unread_threads_count ?? '0'),
        recentThreads: recentThreadsResult.rows,
        nextAppointment: (nextAppointmentResult.rows[0] as Record<string, unknown> | undefined) ?? null,
        activeCases: activeCases.slice(0, 4) as Array<Record<string, unknown>>,
        recentDocuments: recentDocuments.items,
        recentActivity: recentActivityResult.rows,
      }),
    };
  }
}
