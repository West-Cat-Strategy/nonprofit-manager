import pool from '@config/database';
import { logger } from '@config/logger';
import { resolvePortalCaseSelection } from '@services/portalPointpersonService';
import {
  applySlotTransition,
  createCaseLinkedAppointmentResolution,
  getCaseLinkedAppointmentResolution,
} from '../portalAppointmentStatusWorkflow';
import { cancelPendingJobsForAppointment, syncJobsForAppointment } from '../appointmentReminderService';
import type { PortalAppointment } from '../portalAppointmentSlotService';
import { publishAppointmentUpdated, publishSlotUpdated } from './delivery';
import { getAppointmentById, getSlotById } from './queries';

export const bookPortalAppointmentSlot = async (input: {
  slotId: string;
  contactId: string;
  portalUserId: string;
  caseId?: string | null;
  title?: string | null;
  description?: string | null;
}): Promise<PortalAppointment> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the slot row directly before reading joined/aggregated slot details.
    await client.query(
      `SELECT id
       FROM appointment_availability_slots
       WHERE id = $1
       FOR UPDATE`,
      [input.slotId]
    );

    const slotResult = await client.query(
      `SELECT
         s.*,
         c.case_number,
         c.title AS case_title,
         u.first_name AS pointperson_first_name,
         u.last_name AS pointperson_last_name,
         u.email AS pointperson_email,
         GREATEST(s.capacity - s.booked_count, 0) AS available_count
       FROM appointment_availability_slots s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN users u ON u.id = s.pointperson_user_id
       WHERE s.id = $1`,
      [input.slotId]
    );

    const slot = slotResult.rows[0] as (Record<string, unknown> & { available_count: number }) | undefined;
    if (!slot) {
      throw new Error('Slot not found');
    }
    if (slot.status !== 'open') {
      throw new Error('Slot is not open for booking');
    }
    if (Number(slot.capacity || 0) <= Number(slot.booked_count || 0)) {
      throw new Error('Slot is fully booked');
    }

    const selection = await resolvePortalCaseSelection(input.contactId, (input.caseId || (slot.case_id as string | null)) || undefined);
    const selectedCase = selection.selected_case;

    if (!selectedCase || !selectedCase.assigned_to) {
      throw new Error('Selected case does not have an assigned pointperson');
    }

    if (selectedCase.assigned_to !== slot.pointperson_user_id) {
      throw new Error('Selected case pointperson does not match slot owner');
    }

    if (slot.case_id && selectedCase.case_id !== slot.case_id) {
      throw new Error('Slot is bound to a different case');
    }

    const appointmentInsert = await client.query(
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
        slot_id,
        request_type
      ) VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7, $8, $9, $10, 'slot_booking')
      RETURNING id`,
      [
        input.contactId,
        input.title?.trim() || (slot.title as string | null) || 'Appointment',
        input.description?.trim() || (slot.details as string | null) || null,
        slot.start_time as string,
        slot.end_time as string,
        slot.location || null,
        input.portalUserId,
        selectedCase.case_id,
        selectedCase.assigned_to,
        slot.id,
      ]
    );

    await client.query(
      `UPDATE appointment_availability_slots
       SET booked_count = booked_count + 1,
           status = CASE WHEN booked_count + 1 >= capacity THEN 'closed' ELSE status END,
           updated_at = NOW()
       WHERE id = $1`,
      [slot.id]
    );

    await client.query('COMMIT');

    const appointment = await getAppointmentById(appointmentInsert.rows[0].id as string);
    if (!appointment) {
      throw new Error('Failed to load booked appointment');
    }

    const updatedSlot = await getSlotById(slot.id as string);
    publishAppointmentUpdated({
      entityId: appointment.id,
      caseId: appointment.case_id,
      status: appointment.status,
      actorType: 'portal',
      source: 'portal.appointment.slot_booked',
      contactId: appointment.contact_id,
    });

    if (updatedSlot) {
      publishSlotUpdated({
        entityId: updatedSlot.id,
        caseId: updatedSlot.case_id,
        status: updatedSlot.status,
        actorType: 'portal',
        source: 'portal.slot.booked',
        contactId: appointment.contact_id,
      });
    }

    try {
      await syncJobsForAppointment(appointment.id);
    } catch (error) {
      logger.warn('Failed to sync appointment reminder jobs after slot booking', {
        appointmentId: appointment.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return appointment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const cancelPortalAppointment = async (input: {
  appointmentId: string;
  contactId: string;
}): Promise<PortalAppointment | null> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT id, status, slot_id
       FROM appointments
       WHERE id = $1 AND contact_id = $2
       FOR UPDATE`,
      [input.appointmentId, input.contactId]
    );

    const current = currentResult.rows[0] as { id: string; status: string; slot_id: string | null } | undefined;
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `UPDATE appointments
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [input.appointmentId]
    );

    if (current.slot_id) {
      await applySlotTransition(client, {
        slotId: current.slot_id,
        previousStatus: current.status,
        nextStatus: 'cancelled',
      });
    }

    await client.query('COMMIT');
    const cancelledAppointment = await getAppointmentById(input.appointmentId);
    if (!cancelledAppointment) {
      return null;
    }

    publishAppointmentUpdated({
      entityId: cancelledAppointment.id,
      caseId: cancelledAppointment.case_id,
      status: cancelledAppointment.status,
      actorType: 'portal',
      source: 'portal.appointment.cancelled',
      contactId: cancelledAppointment.contact_id,
    });

    if (current.slot_id) {
      const updatedSlot = await getSlotById(current.slot_id);
      if (updatedSlot) {
        publishSlotUpdated({
          entityId: updatedSlot.id,
          caseId: updatedSlot.case_id,
          status: updatedSlot.status,
          actorType: 'portal',
          source: 'portal.slot.released',
          contactId: cancelledAppointment.contact_id,
        });
      }
    }

    try {
      await cancelPendingJobsForAppointment(
        cancelledAppointment.id,
        'appointment_cancelled_by_portal'
      );
    } catch (error) {
      logger.warn('Failed to cancel appointment reminder jobs after portal cancellation', {
        appointmentId: cancelledAppointment.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return cancelledAppointment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateAppointmentStatusByStaff = async (input: {
  appointmentId: string;
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  checkedInBy?: string | null;
  resolutionNote?: string;
  outcomeDefinitionIds?: string[];
  outcomeVisibility?: boolean;
}): Promise<PortalAppointment | null> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT id, status, slot_id, case_id
       FROM appointments
       WHERE id = $1
       FOR UPDATE`,
      [input.appointmentId]
    );

    const current = currentResult.rows[0] as {
      id: string;
      status: string;
      slot_id: string | null;
      case_id: string | null;
    } | undefined;
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    const resolution = getCaseLinkedAppointmentResolution({
      caseId: current.case_id,
      appointmentId: input.appointmentId,
      status: input.status,
      checkedInBy: input.checkedInBy,
      resolutionNote: input.resolutionNote,
      outcomeDefinitionIds: input.outcomeDefinitionIds,
    });

    await client.query(
      `UPDATE appointments
       SET status = $1::varchar,
           checked_in_at = CASE
             WHEN $4::text = 'completed' THEN COALESCE(checked_in_at, NOW())
             ELSE checked_in_at
           END,
           checked_in_by = CASE
             WHEN $4::text = 'completed' THEN COALESCE($3::uuid, checked_in_by)
             ELSE checked_in_by
           END,
           updated_at = NOW()
       WHERE id = $2`,
      [input.status, input.appointmentId, input.checkedInBy ?? null, input.status]
    );

    if (current.slot_id) {
      await applySlotTransition(client, {
        slotId: current.slot_id,
        previousStatus: current.status,
        nextStatus: input.status,
      });
    }

    await createCaseLinkedAppointmentResolution(client, {
      caseId: current.case_id,
      appointmentId: input.appointmentId,
      checkedInBy: input.checkedInBy,
      status: input.status,
      resolutionNote: resolution.resolutionNote,
      outcomeDefinitionIds: resolution.outcomeDefinitionIds,
      outcomeVisibility: input.outcomeVisibility,
      needsResolution: resolution.needsResolution,
    });

    await client.query('COMMIT');
    const updatedAppointment = await getAppointmentById(input.appointmentId);
    if (!updatedAppointment) {
      return null;
    }

    publishAppointmentUpdated({
      entityId: updatedAppointment.id,
      caseId: updatedAppointment.case_id,
      status: updatedAppointment.status,
      actorType: 'staff',
      source: 'admin.appointment.status_update',
      contactId: updatedAppointment.contact_id,
    });

    if (current.slot_id && current.status !== input.status) {
      const updatedSlot = await getSlotById(current.slot_id);
      if (updatedSlot) {
        publishSlotUpdated({
          entityId: updatedSlot.id,
          caseId: updatedSlot.case_id,
          status: updatedSlot.status,
          actorType: 'staff',
          source: 'admin.slot.release',
          contactId: updatedAppointment.contact_id,
        });
      }
    }

    try {
      if (input.status === 'confirmed') {
        await syncJobsForAppointment(updatedAppointment.id);
      } else if (input.status === 'cancelled' || input.status === 'completed') {
        await cancelPendingJobsForAppointment(
          updatedAppointment.id,
          `appointment_status_${input.status}`
        );
      }
    } catch (error) {
      logger.warn('Failed to update appointment reminder jobs after status update', {
        appointmentId: updatedAppointment.id,
        status: input.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return updatedAppointment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const checkInAppointmentByStaff = async (input: {
  appointmentId: string;
  checkedInBy: string;
  resolutionNote?: string;
  outcomeDefinitionIds?: string[];
  outcomeVisibility?: boolean;
}): Promise<PortalAppointment | null> =>
  updateAppointmentStatusByStaff({
    appointmentId: input.appointmentId,
    status: 'completed',
    checkedInBy: input.checkedInBy,
    resolutionNote: input.resolutionNote,
    outcomeDefinitionIds: input.outcomeDefinitionIds,
    outcomeVisibility: input.outcomeVisibility,
  });
