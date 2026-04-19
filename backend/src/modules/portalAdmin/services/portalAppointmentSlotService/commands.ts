import pool from '@config/database';
import { resolvePortalCaseSelection } from '@services/portalPointpersonService';
import type { AppointmentSlot, PortalAppointment } from '../portalAppointmentSlotService';
import { getCaseContactId } from '../portalAppointmentStatusWorkflow';
import { publishAppointmentUpdated, publishSlotUpdated } from './delivery';
import { getAppointmentById, getSlotById } from './queries';

export const createAppointmentSlot = async (input: {
  pointpersonUserId: string;
  caseId?: string | null;
  title?: string | null;
  details?: string | null;
  location?: string | null;
  startTime: string;
  endTime: string;
  capacity?: number;
  userId: string;
}): Promise<AppointmentSlot> => {
  const result = await pool.query(
    `INSERT INTO appointment_availability_slots (
      pointperson_user_id,
      case_id,
      title,
      details,
      location,
      start_time,
      end_time,
      capacity,
      created_by,
      updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
    RETURNING id`,
    [
      input.pointpersonUserId,
      input.caseId || null,
      input.title?.trim() || null,
      input.details?.trim() || null,
      input.location?.trim() || null,
      input.startTime,
      input.endTime,
      input.capacity || 1,
      input.userId,
    ]
  );

  const slot = await getSlotById(result.rows[0].id as string);
  if (!slot) {
    throw new Error('Failed to create slot');
  }

  const contactId = await getCaseContactId(pool, slot.case_id);
  publishSlotUpdated({
    entityId: slot.id,
    caseId: slot.case_id,
    status: slot.status,
    actorType: 'staff',
    source: 'admin.slot.create',
    contactId,
  });

  return slot;
};

export const updateAppointmentSlot = async (input: {
  slotId: string;
  pointpersonUserId?: string;
  caseId?: string | null;
  title?: string | null;
  details?: string | null;
  location?: string | null;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  status?: 'open' | 'closed' | 'cancelled';
  userId: string;
}): Promise<AppointmentSlot | null> => {
  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  const pushField = (field: string, value: string | number | null) => {
    values.push(value);
    fields.push(`${field} = $${values.length}`);
  };

  if (input.pointpersonUserId !== undefined) pushField('pointperson_user_id', input.pointpersonUserId);
  if (input.caseId !== undefined) pushField('case_id', input.caseId);
  if (input.title !== undefined) pushField('title', input.title?.trim() || null);
  if (input.details !== undefined) pushField('details', input.details?.trim() || null);
  if (input.location !== undefined) pushField('location', input.location?.trim() || null);
  if (input.startTime !== undefined) pushField('start_time', input.startTime);
  if (input.endTime !== undefined) pushField('end_time', input.endTime);
  if (input.capacity !== undefined) pushField('capacity', input.capacity);
  if (input.status !== undefined) pushField('status', input.status);

  if (fields.length === 0) {
    return getSlotById(input.slotId);
  }

  pushField('updated_by', input.userId);
  fields.push('updated_at = NOW()');
  values.push(input.slotId);

  const result = await pool.query(
    `UPDATE appointment_availability_slots
     SET ${fields.join(', ')}
     WHERE id = $${values.length}
     RETURNING id`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  const updatedSlot = await getSlotById(input.slotId);
  if (!updatedSlot) {
    return null;
  }

  const contactId = await getCaseContactId(pool, updatedSlot.case_id);
  publishSlotUpdated({
    entityId: updatedSlot.id,
    caseId: updatedSlot.case_id,
    status: updatedSlot.status,
    actorType: 'staff',
    source: 'admin.slot.update',
    contactId,
  });

  return updatedSlot;
};

export const deleteAppointmentSlot = async (slotId: string): Promise<boolean> => {
  const existingSlot = await getSlotById(slotId);
  if (!existingSlot) {
    return false;
  }

  const appointmentsUsingSlot = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM appointments
     WHERE slot_id = $1
      AND status != 'cancelled'`,
    [slotId]
  );

  const count = Number(appointmentsUsingSlot.rows[0]?.count || 0);
  if (count > 0) {
    await pool.query(
      `UPDATE appointment_availability_slots
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [slotId]
    );
    const cancelledSlot = await getSlotById(slotId);
    const contactId = await getCaseContactId(pool, cancelledSlot?.case_id ?? existingSlot.case_id);
    publishSlotUpdated({
      entityId: slotId,
      caseId: cancelledSlot?.case_id ?? existingSlot.case_id,
      status: cancelledSlot?.status ?? 'cancelled',
      actorType: 'staff',
      source: 'admin.slot.cancel',
      contactId,
    });
    return true;
  }

  const result = await pool.query(
    'DELETE FROM appointment_availability_slots WHERE id = $1 RETURNING id',
    [slotId]
  );
  const deleted = Boolean(result.rows[0]);
  if (deleted) {
    const contactId = await getCaseContactId(pool, existingSlot.case_id);
    publishSlotUpdated({
      entityId: slotId,
      caseId: existingSlot.case_id,
      status: 'deleted',
      actorType: 'staff',
      source: 'admin.slot.delete',
      contactId,
    });
  }

  return deleted;
};

export const createPortalManualAppointmentRequest = async (input: {
  contactId: string;
  portalUserId: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  description?: string | null;
  location?: string | null;
  caseId?: string | null;
}): Promise<PortalAppointment> => {
  const selection = await resolvePortalCaseSelection(input.contactId, input.caseId);
  const selectedCase = selection.selected_case;

  if (!selectedCase || !selectedCase.assigned_to) {
    throw new Error('Selected case does not have an assigned pointperson');
  }

  const result = await pool.query(
    `INSERT INTO appointments (
      contact_id,
      title,
      description,
      start_time,
      end_time,
      status,
      location,
      requested_by_portal,
      case_id,
      pointperson_user_id,
      request_type
    ) VALUES ($1, $2, $3, $4, $5, 'requested', $6, $7, $8, $9, 'manual_request')
    RETURNING id`,
    [
      input.contactId,
      input.title.trim(),
      input.description?.trim() || null,
      input.startTime,
      input.endTime || null,
      input.location?.trim() || null,
      input.portalUserId,
      selectedCase.case_id,
      selectedCase.assigned_to,
    ]
  );

  const appointment = await getAppointmentById(result.rows[0].id as string);
  if (!appointment) {
    throw new Error('Failed to create appointment request');
  }

  publishAppointmentUpdated({
    entityId: appointment.id,
    caseId: appointment.case_id,
    status: appointment.status,
    actorType: 'portal',
    source: 'portal.appointment.requested',
    contactId: appointment.contact_id,
  });

  return appointment;
};
