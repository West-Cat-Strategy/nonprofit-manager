import pool from '@config/database';
import { logger } from '@config/logger';
import { resolvePortalCaseSelection } from '@services/portalPointpersonService';
import {
  publishPortalAppointmentUpdated,
  publishPortalSlotUpdated,
} from '@services/portalRealtimeService';
import {
  cancelPendingJobsForAppointment,
  syncJobsForAppointment,
} from './appointmentReminderService';
import {
  applySlotTransition,
  createCaseLinkedAppointmentResolution,
  getCaseContactId,
  getCaseLinkedAppointmentResolution,
} from './portalAppointmentStatusWorkflow';

export interface AppointmentSlot {
  id: string;
  pointperson_user_id: string;
  case_id: string | null;
  title: string | null;
  details: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  status: 'open' | 'closed' | 'cancelled';
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  case_number?: string | null;
  case_title?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
  pointperson_email?: string | null;
  available_count?: number;
}

export interface PortalAppointment {
  id: string;
  contact_id: string;
  case_id: string | null;
  pointperson_user_id: string | null;
  slot_id: string | null;
  request_type: 'manual_request' | 'slot_booking';
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  case_number?: string | null;
  case_title?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
  pointperson_email?: string | null;
  portal_user_id?: string | null;
  portal_email?: string | null;
  contact_name?: string | null;
  next_reminder_at?: string | null;
  pending_reminder_jobs?: number;
  last_reminder_sent_at?: string | null;
  reminder_offered?: boolean;
  attendance_state?: 'scheduled' | 'attended' | 'cancelled' | 'no_show';
  linked_note_count?: number;
  linked_outcome_count?: number;
  missing_note?: boolean;
  missing_outcome?: boolean;
  missing_reminder?: boolean;
}

const APPOINTMENT_SELECT = `
  SELECT
    a.id,
    a.contact_id,
    a.case_id,
    a.pointperson_user_id,
    a.slot_id,
    a.request_type,
    a.title,
    a.description,
    a.start_time,
    a.end_time,
    a.status,
    a.checked_in_at,
    a.checked_in_by,
    a.location,
    a.created_at,
    a.updated_at,
    c.case_number,
    c.title AS case_title,
    contact.first_name || ' ' || contact.last_name AS contact_name,
    u.first_name AS pointperson_first_name,
    u.last_name AS pointperson_last_name,
    u.email AS pointperson_email,
    pu.id AS portal_user_id,
    pu.email AS portal_email,
    reminder_jobs.next_reminder_at,
    reminder_jobs.pending_reminder_jobs,
    reminder_jobs.total_reminder_jobs,
    reminder_history.last_reminder_sent_at,
    resolution_counts.linked_note_count,
    resolution_counts.linked_outcome_count,
    CASE
      WHEN a.status = 'cancelled' THEN 'cancelled'
      WHEN a.checked_in_at IS NOT NULL OR a.status = 'completed' THEN 'attended'
      WHEN a.status IN ('requested', 'confirmed') AND COALESCE(a.end_time, a.start_time) < NOW() THEN 'no_show'
      ELSE 'scheduled'
    END AS attendance_state,
    CASE
      WHEN a.case_id IS NOT NULL AND a.status IN ('completed', 'cancelled') AND COALESCE(resolution_counts.linked_note_count, 0) = 0 THEN true
      ELSE false
    END AS missing_note,
    CASE
      WHEN a.case_id IS NOT NULL AND a.status IN ('completed', 'cancelled') AND COALESCE(resolution_counts.linked_outcome_count, 0) = 0 THEN true
      ELSE false
    END AS missing_outcome,
    CASE
      WHEN a.status = 'confirmed'
        AND a.start_time > NOW()
        AND COALESCE(reminder_jobs.total_reminder_jobs, 0) = 0
        AND reminder_history.last_reminder_sent_at IS NULL THEN true
      ELSE false
    END AS missing_reminder,
    CASE
      WHEN COALESCE(reminder_jobs.total_reminder_jobs, 0) > 0
        OR reminder_history.last_reminder_sent_at IS NOT NULL THEN true
      ELSE false
    END AS reminder_offered
  FROM appointments a
  LEFT JOIN cases c ON c.id = a.case_id
  LEFT JOIN contacts contact ON contact.id = a.contact_id
  LEFT JOIN users u ON u.id = a.pointperson_user_id
  LEFT JOIN portal_users pu ON pu.id = a.requested_by_portal
  LEFT JOIN LATERAL (
    SELECT
      MIN(j.scheduled_for) FILTER (WHERE j.status IN ('pending', 'processing')) AS next_reminder_at,
      COUNT(*) FILTER (WHERE j.status IN ('pending', 'processing'))::int AS pending_reminder_jobs,
      COUNT(*)::int AS total_reminder_jobs
    FROM appointment_reminder_jobs j
    WHERE j.appointment_id = a.id
  ) reminder_jobs ON true
  LEFT JOIN LATERAL (
    SELECT MAX(d.sent_at) AS last_reminder_sent_at
    FROM appointment_reminder_deliveries d
    WHERE d.appointment_id = a.id
  ) reminder_history ON true
  LEFT JOIN LATERAL (
    SELECT
      (
        SELECT COUNT(*)::int
        FROM case_notes cn
        WHERE cn.case_id = a.case_id
          AND cn.source_entity_type = 'appointment'
          AND cn.source_entity_id = a.id
      ) AS linked_note_count,
      (
        SELECT COUNT(*)::int
        FROM case_outcomes co
        WHERE co.case_id = a.case_id
          AND co.source_entity_type = 'appointment'
          AND co.source_entity_id = a.id
      ) AS linked_outcome_count
  ) resolution_counts ON true
`;

const SLOT_SELECT = `
  SELECT
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
`;

const normalizeSlot = (row: Record<string, unknown>): AppointmentSlot => ({
  ...(row as unknown as AppointmentSlot),
  capacity: Number(row.capacity || 0),
  booked_count: Number(row.booked_count || 0),
  available_count: Number(row.available_count || 0),
});

export const listPortalAppointmentSlots = async (
  contactId: string,
  filters?: { caseId?: string | null; from?: string; to?: string }
): Promise<{ selected_case_id: string | null; selected_pointperson_user_id: string | null; slots: AppointmentSlot[] }> => {
  const selection = await resolvePortalCaseSelection(contactId, filters?.caseId);
  const selectedCase = selection.selected_case;
  if (!selectedCase || !selectedCase.assigned_to) {
    return {
      selected_case_id: selection.selected_case_id,
      selected_pointperson_user_id: selection.selected_pointperson_user_id,
      slots: [],
    };
  }

  const values: Array<string | number | null> = [selectedCase.assigned_to, selectedCase.case_id];
  let whereClause = `
     WHERE s.status = 'open'
       AND s.start_time >= NOW()
       AND s.pointperson_user_id = $1
       AND (s.case_id IS NULL OR s.case_id = $2)
       AND s.capacity > s.booked_count`;

  if (filters?.from) {
    values.push(filters.from);
    whereClause += ` AND s.start_time >= $${values.length}`;
  }

  if (filters?.to) {
    values.push(filters.to);
    whereClause += ` AND s.start_time <= $${values.length}`;
  }

  const result = await pool.query(
    `${SLOT_SELECT}
     ${whereClause}
     ORDER BY s.start_time ASC`,
    values
  );

  return {
    selected_case_id: selectedCase.case_id,
    selected_pointperson_user_id: selectedCase.assigned_to,
    slots: result.rows.map((row) => normalizeSlot(row as Record<string, unknown>)),
  };
};

export const listAdminAppointmentSlots = async (filters?: {
  status?: 'open' | 'closed' | 'cancelled';
  pointpersonUserId?: string;
  caseId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<AppointmentSlot[]> => {
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`s.status = $${values.length}`);
  }

  if (filters?.pointpersonUserId) {
    values.push(filters.pointpersonUserId);
    conditions.push(`s.pointperson_user_id = $${values.length}`);
  }

  if (filters?.caseId) {
    values.push(filters.caseId);
    conditions.push(`s.case_id = $${values.length}`);
  }

  if (filters?.from) {
    values.push(filters.from);
    conditions.push(`s.start_time >= $${values.length}`);
  }

  if (filters?.to) {
    values.push(filters.to);
    conditions.push(`s.start_time <= $${values.length}`);
  }

  let paginationSql = '';
  if (typeof filters?.limit === 'number') {
    values.push(filters.limit);
    paginationSql += ` LIMIT $${values.length}`;
  }
  if (typeof filters?.offset === 'number' && filters.offset > 0) {
    values.push(filters.offset);
    paginationSql += ` OFFSET $${values.length}`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `${SLOT_SELECT}
     ${whereClause}
     ORDER BY s.start_time ASC${paginationSql}`,
    values
  );

  return result.rows.map((row) => normalizeSlot(row as Record<string, unknown>));
};

export const listAdminAppointments = async (filters?: {
  status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  requestType?: 'manual_request' | 'slot_booking';
  caseId?: string;
  pointpersonUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: PortalAppointment[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
  const page = Math.max(1, filters?.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`a.status = $${values.length}`);
  }
  if (filters?.requestType) {
    values.push(filters.requestType);
    conditions.push(`a.request_type = $${values.length}`);
  }
  if (filters?.caseId) {
    values.push(filters.caseId);
    conditions.push(`a.case_id = $${values.length}`);
  }
  if (filters?.pointpersonUserId) {
    values.push(filters.pointpersonUserId);
    conditions.push(`a.pointperson_user_id = $${values.length}`);
  }
  if (filters?.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`a.start_time >= $${values.length}`);
  }
  if (filters?.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`a.start_time <= $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM appointments a
     ${whereClause}`,
    values
  );
  const total = Number.parseInt(countResult.rows[0]?.total || '0', 10);

  const pagedValues = [...values, limit, offset];
  const rows = await pool.query<PortalAppointment>(
    `${APPOINTMENT_SELECT}
     ${whereClause}
     ORDER BY a.start_time ASC
     LIMIT $${pagedValues.length - 1}
     OFFSET $${pagedValues.length}`,
    pagedValues
  );

  return {
    data: rows.rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
  };
};

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
  publishPortalSlotUpdated({
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
  publishPortalSlotUpdated({
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
    publishPortalSlotUpdated({
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
    publishPortalSlotUpdated({
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

export const getSlotById = async (slotId: string): Promise<AppointmentSlot | null> => {
  const result = await pool.query(
    `${SLOT_SELECT}
     WHERE s.id = $1`,
    [slotId]
  );

  if (!result.rows[0]) {
    return null;
  }

  return normalizeSlot(result.rows[0] as Record<string, unknown>);
};

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
      `${SLOT_SELECT}
       WHERE s.id = $1`,
      [input.slotId]
    );

    const slot = slotResult.rows[0] as (AppointmentSlot & { available_count: number }) | undefined;
    if (!slot) {
      throw new Error('Slot not found');
    }
    if (slot.status !== 'open') {
      throw new Error('Slot is not open for booking');
    }
    if (Number(slot.capacity) <= Number(slot.booked_count)) {
      throw new Error('Slot is fully booked');
    }

    const selection = await resolvePortalCaseSelection(input.contactId, input.caseId || slot.case_id || undefined);
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
        input.title?.trim() || slot.title || 'Appointment',
        input.description?.trim() || slot.details || null,
        slot.start_time,
        slot.end_time,
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

    const updatedSlot = await getSlotById(slot.id);
    publishPortalAppointmentUpdated({
      entityId: appointment.id,
      caseId: appointment.case_id,
      status: appointment.status,
      actorType: 'portal',
      source: 'portal.appointment.slot_booked',
      contactId: appointment.contact_id,
    });

    if (updatedSlot) {
      publishPortalSlotUpdated({
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

  publishPortalAppointmentUpdated({
    entityId: appointment.id,
    caseId: appointment.case_id,
    status: appointment.status,
    actorType: 'portal',
    source: 'portal.appointment.requested',
    contactId: appointment.contact_id,
  });

  return appointment;
};

export const listPortalAppointments = async (
  contactId: string,
  filters?: {
    status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
    caseId?: string;
    from?: string;
    to?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<PortalAppointment[]> => {
  const conditions: string[] = ['a.contact_id = $1'];
  const values: Array<string | number> = [contactId];

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`a.status = $${values.length}`);
  }

  if (filters?.caseId) {
    values.push(filters.caseId);
    conditions.push(`a.case_id = $${values.length}`);
  }

  if (filters?.from) {
    values.push(filters.from);
    conditions.push(`a.start_time >= $${values.length}`);
  }

  if (filters?.to) {
    values.push(filters.to);
    conditions.push(`a.start_time <= $${values.length}`);
  }

  if (filters?.search) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(COALESCE(a.title, '') ILIKE $${values.length}
        OR COALESCE(a.description, '') ILIKE $${values.length}
        OR COALESCE(c.case_number, '') ILIKE $${values.length}
        OR COALESCE(c.title, '') ILIKE $${values.length}
        OR COALESCE(a.location, '') ILIKE $${values.length}
        OR COALESCE(a.status, '') ILIKE $${values.length})`
    );
  }

  let paginationSql = '';
  if (typeof filters?.limit === 'number') {
    values.push(filters.limit);
    paginationSql += ` LIMIT $${values.length}`;
  }
  if (typeof filters?.offset === 'number' && filters.offset > 0) {
    values.push(filters.offset);
    paginationSql += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(
    `${APPOINTMENT_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY a.start_time ASC${paginationSql}`,
    values
  );

  return result.rows as PortalAppointment[];
};

export const getAppointmentById = async (appointmentId: string): Promise<PortalAppointment | null> => {
  const result = await pool.query(
    `${APPOINTMENT_SELECT}
     WHERE a.id = $1`,
    [appointmentId]
  );

  return (result.rows[0] as PortalAppointment | undefined) || null;
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

    publishPortalAppointmentUpdated({
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
        publishPortalSlotUpdated({
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

    publishPortalAppointmentUpdated({
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
        publishPortalSlotUpdated({
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
