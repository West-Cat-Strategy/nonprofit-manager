import type {
  CaseFormActorType,
  CaseFormAssignmentEvent,
  CaseFormAssignmentEventMetadataValue,
  CaseFormAssignmentEventType,
} from '@app-types/caseForms';
import type { DbExecutor } from './caseFormsRepository.shared';
import { parseJsonRecord } from './caseFormsRepository.shared';

type AssignmentEventInput = {
  assignmentId: string;
  caseId: string;
  contactId: string;
  accountId?: string | null;
  eventType: CaseFormAssignmentEventType;
  actorType: CaseFormActorType;
  actorUserId?: string | null;
  actorPortalUserId?: string | null;
  submissionId?: string | null;
  accessTokenId?: string | null;
  metadata?: Record<string, CaseFormAssignmentEventMetadataValue>;
};

const mapEventMetadata = (value: unknown): Record<string, CaseFormAssignmentEventMetadataValue> => {
  const raw = parseJsonRecord(value);
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, CaseFormAssignmentEventMetadataValue] => {
      const [, metadataValue] = entry;
      return (
        metadataValue === null
        || typeof metadataValue === 'string'
        || typeof metadataValue === 'number'
      );
    })
  );
};

const mapAssignmentEvent = (row: Record<string, unknown>): CaseFormAssignmentEvent => ({
  id: String(row.id),
  assignment_id: String(row.assignment_id),
  case_id: String(row.case_id),
  contact_id: String(row.contact_id),
  account_id: (row.account_id as string | null | undefined) ?? null,
  event_type: String(row.event_type) as CaseFormAssignmentEventType,
  actor_type: String(row.actor_type) as CaseFormActorType,
  actor_user_id: (row.actor_user_id as string | null | undefined) ?? null,
  actor_portal_user_id: (row.actor_portal_user_id as string | null | undefined) ?? null,
  submission_id: (row.submission_id as string | null | undefined) ?? null,
  access_token_id: (row.access_token_id as string | null | undefined) ?? null,
  metadata: mapEventMetadata(row.metadata),
  created_at: row.created_at as Date | string,
});

export async function createAssignmentEvent(
  executor: DbExecutor,
  input: AssignmentEventInput
): Promise<CaseFormAssignmentEvent> {
  const result = await executor.query(
    `INSERT INTO case_form_assignment_events (
       assignment_id,
       case_id,
       contact_id,
       account_id,
       event_type,
       actor_type,
       actor_user_id,
       actor_portal_user_id,
       submission_id,
       access_token_id,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
     RETURNING *`,
    [
      input.assignmentId,
      input.caseId,
      input.contactId,
      input.accountId || null,
      input.eventType,
      input.actorType,
      input.actorUserId || null,
      input.actorPortalUserId || null,
      input.submissionId || null,
      input.accessTokenId || null,
      JSON.stringify(input.metadata || {}),
    ]
  );
  return mapAssignmentEvent(result.rows[0]);
}

export async function listAssignmentEvents(
  db: DbExecutor,
  assignmentId: string
): Promise<CaseFormAssignmentEvent[]> {
  const result = await db.query(
    `SELECT *
     FROM case_form_assignment_events
     WHERE assignment_id = $1
     ORDER BY created_at DESC, id DESC`,
    [assignmentId]
  );
  return result.rows.map(mapAssignmentEvent);
}
