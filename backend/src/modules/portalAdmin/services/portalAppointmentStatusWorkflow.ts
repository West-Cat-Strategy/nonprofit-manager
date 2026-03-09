import type { Pool, PoolClient } from 'pg';
import { createCaseWorkflowArtifacts } from '@services/caseWorkflowService';

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

export const getCaseContactId = async (
  db: Queryable,
  caseId: string | null | undefined
): Promise<string | null> => {
  if (!caseId) {
    return null;
  }

  const result = await db.query<{ contact_id: string }>(
    'SELECT contact_id FROM cases WHERE id = $1 LIMIT 1',
    [caseId]
  );
  return result.rows[0]?.contact_id ?? null;
};

const statusConsumesSlotCapacity = (status: string): boolean => status !== 'cancelled';

export const applySlotTransition = async (
  client: Queryable,
  args: { slotId: string; previousStatus: string; nextStatus: string }
): Promise<void> => {
  const previousConsumes = statusConsumesSlotCapacity(args.previousStatus);
  const nextConsumes = statusConsumesSlotCapacity(args.nextStatus);

  if (previousConsumes === nextConsumes) {
    return;
  }

  const slotResult = await client.query<{
    id: string;
    status: 'open' | 'closed' | 'cancelled';
    capacity: number;
    booked_count: number;
  }>(
    `SELECT id, status, capacity, booked_count
     FROM appointment_availability_slots
     WHERE id = $1
     FOR UPDATE`,
    [args.slotId]
  );

  const slot = slotResult.rows[0];
  if (!slot) {
    throw new Error('Appointment slot not found');
  }

  if (!previousConsumes && nextConsumes) {
    if (slot.status === 'cancelled') {
      throw new Error('Cannot confirm an appointment tied to a cancelled slot');
    }
    if (Number(slot.booked_count) >= Number(slot.capacity)) {
      throw new Error('Slot is fully booked');
    }

    await client.query(
      `UPDATE appointment_availability_slots
       SET booked_count = booked_count + 1,
           status = CASE
             WHEN booked_count + 1 >= capacity THEN 'closed'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [args.slotId]
    );
    return;
  }

  await client.query(
    `UPDATE appointment_availability_slots
     SET booked_count = GREATEST(booked_count - 1, 0),
         status = CASE
           WHEN status = 'closed' AND booked_count - 1 < capacity THEN 'open'
           ELSE status
         END,
         updated_at = NOW()
     WHERE id = $1`,
    [args.slotId]
  );
};

export const getCaseLinkedAppointmentResolution = (input: {
  caseId: string | null;
  appointmentId: string;
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  checkedInBy?: string | null;
  resolutionNote?: string;
  outcomeDefinitionIds?: string[];
}) => {
  const isCheckInCompletion = input.status === 'completed' && Boolean(input.checkedInBy);
  const needsResolution =
    input.caseId !== null &&
    (input.status === 'cancelled' || (input.status === 'completed' && !isCheckInCompletion));
  const resolutionNote = input.resolutionNote?.trim() || '';
  const outcomeDefinitionIds = input.outcomeDefinitionIds || [];

  if (needsResolution && !resolutionNote) {
    throw Object.assign(
      new Error('resolution_note is required for case-linked completed/cancelled appointments'),
      { statusCode: 400, code: 'validation_error' }
    );
  }
  if (needsResolution && outcomeDefinitionIds.length === 0) {
    throw Object.assign(
      new Error(
        'At least one outcome definition is required for case-linked completed/cancelled appointments'
      ),
      { statusCode: 400, code: 'validation_error' }
    );
  }

  return {
    isCheckInCompletion,
    needsResolution,
    resolutionNote,
    outcomeDefinitionIds,
  };
};

export const createCaseLinkedAppointmentResolution = async (
  client: Queryable,
  input: {
    caseId: string | null;
    appointmentId: string;
    checkedInBy?: string | null;
    status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
    resolutionNote: string;
    outcomeDefinitionIds: string[];
    outcomeVisibility?: boolean;
    needsResolution: boolean;
  }
): Promise<void> => {
  if (!input.needsResolution || !input.caseId) {
    return;
  }

  await createCaseWorkflowArtifacts(client, {
    caseId: input.caseId,
    userId: input.checkedInBy || null,
    note: {
      noteType: 'meeting',
      subject: input.status === 'completed' ? 'Appointment completed' : 'Appointment cancelled',
      content: input.resolutionNote,
      sourceEntityType: 'appointment',
      sourceEntityId: input.appointmentId,
    },
    outcomes: {
      outcomeDefinitionIds: input.outcomeDefinitionIds,
      notes: input.resolutionNote,
      visibleToClient: Boolean(input.outcomeVisibility),
      workflowStage: 'appointment',
      sourceEntityType: 'appointment',
      sourceEntityId: input.appointmentId,
    },
  });
};
