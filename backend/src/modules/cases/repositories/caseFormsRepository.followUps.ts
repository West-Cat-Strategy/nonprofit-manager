import type { DbExecutor } from './caseFormsRepository.shared';

export interface ReviewFollowUpRecord {
  id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export async function getReviewFollowUp(
  executor: DbExecutor,
  organizationId: string,
  followUpId: string
): Promise<ReviewFollowUpRecord | null> {
  const result = await executor.query<ReviewFollowUpRecord>(
    `SELECT id, status
     FROM follow_ups
     WHERE organization_id = $1
       AND id = $2
     LIMIT 1`,
    [organizationId, followUpId]
  );
  return result.rows[0] || null;
}

export async function createReviewFollowUp(
  executor: DbExecutor,
  input: {
    organizationId: string;
    caseId: string;
    title: string;
    description?: string | null;
    scheduledDate: string;
    assignedTo?: string | null;
    userId?: string | null;
  }
): Promise<string> {
  const result = await executor.query<{ id: string }>(
    `INSERT INTO follow_ups (
       organization_id,
       entity_type,
       entity_id,
       title,
       description,
       scheduled_date,
       scheduled_time,
       frequency,
       status,
       assigned_to,
       reminder_minutes_before,
       created_by,
       modified_by
     )
     VALUES ($1, 'case', $2, $3, $4, $5, NULL, 'once', 'scheduled', $6, NULL, $7, $7)
     RETURNING id`,
    [
      input.organizationId,
      input.caseId,
      input.title,
      input.description || null,
      input.scheduledDate,
      input.assignedTo || null,
      input.userId || null,
    ]
  );
  return result.rows[0].id;
}

export async function updateScheduledReviewFollowUp(
  executor: DbExecutor,
  input: {
    organizationId: string;
    followUpId: string;
    title: string;
    description?: string | null;
    scheduledDate: string;
    assignedTo?: string | null;
    userId?: string | null;
  }
): Promise<boolean> {
  const result = await executor.query(
    `UPDATE follow_ups
     SET title = $3,
         description = $4,
         scheduled_date = $5,
         scheduled_time = NULL,
         assigned_to = $6,
         modified_by = $7,
         updated_at = NOW()
     WHERE organization_id = $1
       AND id = $2
       AND status = 'scheduled'
     RETURNING id`,
    [
      input.organizationId,
      input.followUpId,
      input.title,
      input.description || null,
      input.scheduledDate,
      input.assignedTo || null,
      input.userId || null,
    ]
  );
  return Boolean(result.rows[0]);
}

export async function completeReviewFollowUp(
  executor: DbExecutor,
  input: {
    organizationId: string;
    followUpId: string;
    notes: string;
    userId?: string | null;
  }
): Promise<boolean> {
  const result = await executor.query(
    `UPDATE follow_ups
     SET status = 'completed',
         completed_date = NOW(),
         completed_notes = $3,
         modified_by = $4,
         updated_at = NOW()
     WHERE organization_id = $1
       AND id = $2
       AND status = 'scheduled'
     RETURNING id`,
    [input.organizationId, input.followUpId, input.notes, input.userId || null]
  );
  await executor.query(
    `DELETE FROM follow_up_notifications
     WHERE follow_up_id = $1
       AND status IN ('pending', 'processing')`,
    [input.followUpId]
  );
  return Boolean(result.rows[0]);
}

export async function cancelReviewFollowUp(
  executor: DbExecutor,
  input: {
    organizationId: string;
    followUpId: string;
    notes: string;
    userId?: string | null;
  }
): Promise<boolean> {
  const result = await executor.query(
    `UPDATE follow_ups
     SET status = 'cancelled',
         completed_notes = $3,
         modified_by = $4,
         updated_at = NOW()
     WHERE organization_id = $1
       AND id = $2
       AND status = 'scheduled'
     RETURNING id`,
    [input.organizationId, input.followUpId, input.notes, input.userId || null]
  );
  await executor.query(
    `DELETE FROM follow_up_notifications
     WHERE follow_up_id = $1
       AND status IN ('pending', 'processing')`,
    [input.followUpId]
  );
  return Boolean(result.rows[0]);
}
