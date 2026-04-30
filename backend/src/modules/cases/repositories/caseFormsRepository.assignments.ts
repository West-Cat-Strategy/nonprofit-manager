import type { CaseFormAssignmentRecord, DbExecutor } from './caseFormsRepository.shared';
import { assignmentSelect, mapAssignment } from './caseFormsRepository.shared';
import type { CaseFormDeliveryTarget, CaseFormSchema } from '@app-types/caseForms';
import { resolvePortalAssignmentStatuses } from '../usecases/caseForms.usecase.shared';

const mapMutationAssignmentRow = (row: Record<string, unknown>): CaseFormAssignmentRecord =>
  mapAssignment({
    ...row,
    scoped_account_id: row.account_id ?? null,
    case_number: row.case_number ?? null,
    case_title: row.case_title ?? null,
    client_viewable: row.client_viewable ?? null,
    case_assigned_to: row.case_assigned_to ?? null,
    contact_first_name: row.contact_first_name ?? null,
    contact_last_name: row.contact_last_name ?? null,
  });

export async function listAssignmentsForCase(
  db: DbExecutor,
  caseId: string,
  organizationId?: string
): Promise<CaseFormAssignmentRecord[]> {
  const result = await db.query(
    `${assignmentSelect}
     LEFT JOIN contacts scoped_contact ON scoped_contact.id = c.contact_id
     WHERE cfa.case_id = $1
       AND ($2::uuid IS NULL OR COALESCE(c.account_id, scoped_contact.account_id) = $2::uuid)
     ORDER BY cfa.updated_at DESC, cfa.created_at DESC`,
    [caseId, organizationId || null]
  );
  return result.rows.map(mapAssignment);
}

export async function listAssignmentsForPortal(
  db: DbExecutor,
  contactId: string,
  status?: string
): Promise<CaseFormAssignmentRecord[]> {
  const statusFilter = resolvePortalAssignmentStatuses(status);
  const result = await db.query(
    `${assignmentSelect}
     WHERE cfa.contact_id = $1
       AND c.client_viewable = true
       AND cfa.delivery_target IN ('portal', 'portal_and_email')
       AND ($2::text[] IS NULL OR cfa.status = ANY($2::text[]))
     ORDER BY COALESCE(cfa.submitted_at, cfa.sent_at, cfa.updated_at) DESC, cfa.updated_at DESC`,
    [contactId, statusFilter]
  );
  return result.rows.map(mapAssignment);
}

export async function getAssignmentById(
  db: DbExecutor,
  assignmentId: string
): Promise<CaseFormAssignmentRecord | null> {
  const result = await db.query(
    `${assignmentSelect}
     WHERE cfa.id = $1
     LIMIT 1`,
    [assignmentId]
  );
  return result.rows[0] ? mapAssignment(result.rows[0]) : null;
}

export async function createAssignment(
  executor: DbExecutor,
  input: {
    caseId: string;
    contactId: string;
    accountId?: string | null;
    caseTypeId?: string | null;
    sourceDefaultId?: string | null;
    sourceDefaultVersion?: number | null;
    title: string;
    description?: string | null;
    schema: CaseFormSchema;
    dueAt?: string | null;
    recipientEmail?: string | null;
    userId?: string | null;
  }
): Promise<CaseFormAssignmentRecord> {
  const result = await executor.query(
    `INSERT INTO case_form_assignments (
       case_id,
       contact_id,
       account_id,
       case_type_id,
       source_default_id,
       source_default_version,
       title,
       description,
       status,
       schema,
       current_draft_answers,
       due_at,
       recipient_email,
       created_by,
       updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9::jsonb, '{}'::jsonb, $10, $11, $12, $12)
     RETURNING *`,
    [
      input.caseId,
      input.contactId,
      input.accountId || null,
      input.caseTypeId || null,
      input.sourceDefaultId || null,
      input.sourceDefaultVersion ?? null,
      input.title,
      input.description || null,
      JSON.stringify(input.schema),
      input.dueAt || null,
      input.recipientEmail || null,
      input.userId || null,
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw Object.assign(new Error('Form assignment insert did not return a row'), {
      statusCode: 500,
      code: 'internal_error',
    });
  }
  return mapMutationAssignmentRow(row);
}

export async function updateAssignment(
  executor: DbExecutor,
  assignmentId: string,
  input: {
    title?: string;
    description?: string | null;
    schema?: CaseFormSchema;
    dueAt?: string | null;
    recipientEmail?: string | null;
    status?: string;
    deliveryTarget?: CaseFormDeliveryTarget | null;
    reviewFollowUpId?: string | null;
    userId?: string | null;
  }
): Promise<CaseFormAssignmentRecord> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (input.title !== undefined) {
    fields.push(`title = $${index++}`);
    values.push(input.title);
  }
  if (input.description !== undefined) {
    fields.push(`description = $${index++}`);
    values.push(input.description || null);
  }
  if (input.schema !== undefined) {
    fields.push(`schema = $${index++}::jsonb`);
    values.push(JSON.stringify(input.schema));
  }
  if (input.dueAt !== undefined) {
    fields.push(`due_at = $${index++}`);
    values.push(input.dueAt || null);
  }
  if (input.recipientEmail !== undefined) {
    fields.push(`recipient_email = $${index++}`);
    values.push(input.recipientEmail || null);
  }
  if (input.status !== undefined) {
    fields.push(`status = $${index++}`);
    values.push(input.status);
  }
  if (input.deliveryTarget !== undefined) {
    fields.push(`delivery_target = $${index++}`);
    values.push(input.deliveryTarget || null);
  }
  if (input.reviewFollowUpId !== undefined) {
    fields.push(`review_follow_up_id = $${index++}`);
    values.push(input.reviewFollowUpId || null);
  }

  fields.push('updated_at = NOW()');
  if (input.userId !== undefined) {
    fields.push(`updated_by = $${index++}`);
    values.push(input.userId);
  }
  values.push(assignmentId);

  const result = await executor.query(
    `UPDATE case_form_assignments
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING *`,
    values
  );

  const row = result.rows[0];
  if (!row) {
    throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
  }
  return mapMutationAssignmentRow(row);
}

export async function markAssignmentSent(executor: DbExecutor, assignmentId: string): Promise<void> {
  await executor.query(
    `UPDATE case_form_assignments
     SET sent_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [assignmentId]
  );
}

export async function saveDraft(
  executor: DbExecutor,
  assignmentId: string,
  answers: Record<string, unknown>,
  input: {
    status: string;
    userId?: string | null;
  }
): Promise<CaseFormAssignmentRecord> {
  await executor.query(
    `UPDATE case_form_assignments
     SET current_draft_answers = $2::jsonb,
         last_draft_saved_at = NOW(),
         status = $3,
         updated_at = NOW(),
         updated_by = $4
     WHERE id = $1`,
    [assignmentId, JSON.stringify(answers), input.status, input.userId || null]
  );

  const assignment = await getAssignmentById(executor, assignmentId);
  if (!assignment) {
    throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
  }
  return assignment;
}

export async function markAssignmentViewed(executor: DbExecutor, assignmentId: string): Promise<void> {
  await executor.query(
    `UPDATE case_form_assignments
     SET viewed_at = COALESCE(viewed_at, NOW()),
         status = CASE
           WHEN status = 'sent' THEN 'viewed'
           ELSE status
         END,
         updated_at = NOW()
     WHERE id = $1`,
    [assignmentId]
  );
}

export async function markAssignmentAfterSubmission(
  executor: DbExecutor,
  assignmentId: string,
  answers: Record<string, unknown>,
  userId?: string | null
): Promise<void> {
  await executor.query(
    `UPDATE case_form_assignments
     SET current_draft_answers = $2::jsonb,
         last_draft_saved_at = NOW(),
         status = 'submitted',
         submitted_at = NOW(),
         revision_requested_at = NULL,
         revision_notes = NULL,
         updated_at = NOW(),
         updated_by = $3
     WHERE id = $1`,
    [assignmentId, JSON.stringify(answers), userId || null]
  );
}

export async function markAssignmentReviewDecision(
  executor: DbExecutor,
  assignmentId: string,
  input: {
    status: 'revision_requested' | 'reviewed' | 'closed' | 'cancelled';
    notes?: string | null;
    userId?: string | null;
  }
): Promise<void> {
  const timestampField =
    input.status === 'revision_requested'
      ? 'revision_requested_at'
      : input.status === 'reviewed'
      ? 'reviewed_at'
      : input.status === 'closed'
        ? 'closed_at'
        : null;

  const assignments: string[] = [
    'status = $2',
    'updated_at = NOW()',
    'updated_by = $3',
  ];
  const values = [assignmentId, input.status, input.userId || null];
  if (input.status === 'revision_requested') {
    assignments.push('revision_requested_at = NOW()');
    assignments.push('revision_notes = $4');
    values.push(input.notes?.trim() || null);
  } else {
    if (timestampField) {
      assignments.push(`${timestampField} = COALESCE(${timestampField}, NOW())`);
    }
    assignments.push('revision_notes = NULL');
  }

  await executor.query(
    `UPDATE case_form_assignments
     SET ${assignments.join(', ')}
     WHERE id = $1`,
    values
  );
}
